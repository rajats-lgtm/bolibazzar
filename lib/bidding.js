import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { computeValueScore, rankOffers } from './scoring';
import { notifyBuyerOfOffer, notifyBuyerOfPriceDrop } from './notify';

/**
 * The live auction.
 *
 * A request opens an auction window (default 120s). During that window offers
 * arrive and suppliers may undercut each other. Two kinds of bidder exist:
 *
 *   1. Real suppliers — via auto-bid rules, or by posting an offer by hand.
 *   2. Demo bidders   — seeded `is_demo` supplier accounts that let the auction
 *                       work with no live humans. Switched off by DEMO_BIDDERS=false.
 *
 * There is no background worker. Instead every read of the auction "catches up"
 * the schedule: any bid whose arrival time has passed is inserted, and any price
 * drop that is due is applied. That makes the timeline real (bids genuinely
 * appear seconds apart) while staying stateless and restart-safe.
 */

export const AUCTION_WINDOW_MS = Number(process.env.AUCTION_WINDOW_SECONDS || 120) * 1000;

export function demoBiddersEnabled() {
  return process.env.DEMO_BIDDERS !== 'false';
}

// --- deterministic RNG so the same request always plays out the same way -----

function seedFrom(text) {
  const hash = crypto.createHash('sha256').update(String(text)).digest();
  return hash.readUInt32LE(0);
}

/** mulberry32 — small, fast, good enough for scheduling. */
function rngFrom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_DEFAULT_BUDGET = {
  smartphone: 80000, laptop: 90000, tablet: 45000, tv: 60000, gaming_console: 55000,
  smartwatch: 30000, headphones: 20000, camera: 70000, accessory: 5000, other: 25000,
};

const EXTRAS = [
  'Free tempered glass + case',
  'Instant HDFC 10% off (max ₹5,000)',
  'Free shipping + free installation',
  'No-cost EMI up to 12 months',
  '₹3,000 exchange bonus on old device',
  'Complimentary 20W adapter + cable',
  'Free 1-year extended warranty',
];

function warrantyFor(type) {
  if (type === 'brand_store') return '1 year manufacturer + 6 months BoliBazzar extended';
  if (type === 'authorised_reseller') return '1 year manufacturer + on-site pickup';
  return '1 year manufacturer';
}

function deliveryNote(days, city) {
  if (days === 0) return `Same-day delivery in ${city || 'your city'}`;
  if (days === 1) return 'Next-day delivery';
  return `${days}-day pan-India shipping`;
}

/**
 * Build the full deterministic script for a request's demo bidders.
 * Returns bids with arrival offsets and a price-drop ladder, all in ms from
 * the auction start.
 */
export function planDemoBids(request, suppliers) {
  const requirement = request.requirement || {};
  const rng = rngFrom(seedFrom(request.id));
  const budget =
    requirement.budget_inr && requirement.budget_inr > 500
      ? requirement.budget_inr
      : CATEGORY_DEFAULT_BUDGET[requirement.sub_category] || 40000;

  const location = String(requirement.location || '').toLowerCase();
  // Local suppliers bid first and cheapest — that is the whole pitch of the product.
  const ordered = [...suppliers].sort((a, b) => {
    const aLocal = a.city && location.includes(a.city.toLowerCase()) ? 1 : 0;
    const bLocal = b.city && location.includes(b.city.toLowerCase()) ? 1 : 0;
    if (aLocal !== bLocal) return bLocal - aLocal;
    return (b.rating || 0) - (a.rating || 0);
  });

  const count = Math.min(ordered.length, 4 + Math.floor(rng() * 2)); // 4-5 bidders
  const chosen = ordered.slice(0, count);

  return chosen.map((supplier, index) => {
    const isLocal = supplier.city && location.includes(supplier.city.toLowerCase());
    // Opening price 0.88x - 1.04x of budget; local stores open keener.
    const spread = 0.88 + rng() * 0.16 - (isLocal ? 0.02 : 0);
    const openPrice = Math.round((budget * spread) / 100) * 100;

    // First bid lands fast (people expect instant life), rest trickle in.
    const arriveAt = index === 0 ? 900 + rng() * 900 : 2500 + index * (2200 + rng() * 2600);

    // Each bidder may undercut itself once or twice later in the window.
    const dropCount = rng() < 0.65 ? (rng() < 0.4 ? 2 : 1) : 0;
    const drops = [];
    let price = openPrice;
    for (let d = 0; d < dropCount; d++) {
      const at = arriveAt + (0.35 + d * 0.25 + rng() * 0.2) * AUCTION_WINDOW_MS;
      if (at >= AUCTION_WINDOW_MS) break;
      const cut = 0.012 + rng() * 0.028; // 1.2% - 4%
      price = Math.round((price * (1 - cut)) / 100) * 100;
      drops.push({ at_ms: Math.round(at), price_inr: price });
    }

    const deliveryDays = isLocal && index === 0 ? 0 : Math.max(1, Math.round(1 + rng() * 4));

    return {
      supplier,
      arrive_at_ms: Math.round(arriveAt),
      price_inr: openPrice,
      delivery_days: deliveryDays,
      warranty: warrantyFor(supplier.supplier_type),
      extras: EXTRAS[Math.floor(rng() * EXTRAS.length)],
      validity_hours: [6, 12, 24, 48][Math.floor(rng() * 4)],
      distance_km: isLocal ? Math.round((1 + rng() * 12) * 10) / 10 : null,
      message: `In stock and ready to dispatch${supplier.city ? ' from ' + supplier.city : ''}.`,
      drops,
    };
  });
}

function buildOffer(request, plan, arrivedAt) {
  const supplier = plan.supplier;
  const offer = {
    id: uuidv4(),
    request_id: request.id,
    supplier_id: supplier.id,
    supplier_email: supplier.email || null,
    supplier_phone: supplier.phone || null,
    supplier_name: supplier.business_name + (supplier.city ? ' - ' + supplier.city : ''),
    supplier_type: supplier.supplier_type || 'retail_store',
    price_inr: plan.price_inr,
    delivery_days: plan.delivery_days,
    delivery_note: deliveryNote(plan.delivery_days, supplier.city),
    warranty: plan.warranty,
    rating: supplier.rating || 4.5,
    reviews: supplier.reviews || 0,
    distance_km: plan.distance_km,
    validity_hours: plan.validity_hours,
    extras: plan.extras,
    message: plan.message,
    status: 'pending',
    source: 'demo_bidder',
    is_demo: true,
    bid_plan: { arrive_at_ms: plan.arrive_at_ms, drops: plan.drops },
    drops_applied: 0,
    created_at: new Date(arrivedAt).toISOString(),
  };
  return { ...offer, ...computeValueScore(offer, request.requirement) };
}

/**
 * Advance the auction to "now": insert any demo bids that are due, apply any
 * due price drops, then re-rank every offer on the request.
 *
 * Safe to call as often as you like — it is idempotent for a given clock time.
 */
export async function advanceAuction(db, request) {
  const startedAt = new Date(request.auction_started_at || request.created_at).getTime();
  const endsAt = startedAt + AUCTION_WINDOW_MS;
  const now = Date.now();
  const elapsed = now - startedAt;
  const live = now < endsAt && request.status === 'open';
  const changes = { inserted: [], dropped: [] };

  if (demoBiddersEnabled() && request.status === 'open') {
    const existing = await db
      .collection('offers')
      .find({ request_id: request.id, source: 'demo_bidder' }, { projection: { _id: 0 } })
      .toArray();
    const seen = new Set(existing.map((o) => o.supplier_id));

    const demoSuppliers = await db
      .collection('suppliers')
      .find({ status: 'approved', is_demo: true })
      .limit(40)
      .toArray();

    if (demoSuppliers.length) {
      const plans = planDemoBids(request, demoSuppliers);

      // 1. Insert bids whose arrival time has passed.
      for (const plan of plans) {
        if (seen.has(plan.supplier.id)) continue;
        if (elapsed < plan.arrive_at_ms) continue;
        const offer = buildOffer(request, plan, startedAt + plan.arrive_at_ms);
        await db.collection('offers').insertOne(offer);
        changes.inserted.push(offer);
        notifyBuyerOfOffer(db, request, offer).catch((e) => console.error('[auction] notify', e.message));
      }

      // 2. Apply price drops that are due on bids already on the board.
      for (const offer of existing) {
        const drops = offer.bid_plan?.drops || [];
        const already = offer.drops_applied || 0;
        let applied = already;
        let price = offer.price_inr;
        let previous = offer.previous_price || null;
        for (let i = already; i < drops.length; i++) {
          if (elapsed < drops[i].at_ms) break;
          previous = price;
          price = drops[i].price_inr;
          applied = i + 1;
        }
        if (applied > already && price < offer.price_inr) {
          const scored = computeValueScore({ ...offer, price_inr: price }, request.requirement);
          await db.collection('offers').updateOne(
            { id: offer.id, status: 'pending' },
            {
              $set: {
                price_inr: price,
                previous_price: previous,
                drops_applied: applied,
                value_score: scored.value_score,
                rationale: scored.rationale,
                last_bid_at: new Date().toISOString(),
              },
            }
          );
          changes.dropped.push({ id: offer.id, old_price: previous, new_price: price });
          notifyBuyerOfPriceDrop(db, request, { ...offer, price_inr: price }, previous).catch(() => null);
        }
      }
    }
  }

  // 3. Re-rank the whole board and persist the AI pick.
  const offers = await db
    .collection('offers')
    .find({ request_id: request.id }, { projection: { _id: 0 } })
    .toArray();
  const ranked = rankOffers(offers, request.requirement);
  await Promise.all(
    ranked.map((offer) =>
      db.collection('offers').updateOne(
        { id: offer.id },
        { $set: { ai_pick: offer.ai_pick, value_score: offer.value_score, rationale: offer.rationale } }
      )
    )
  );

  return {
    offers: ranked,
    auction: {
      live,
      started_at: new Date(startedAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      seconds_remaining: Math.max(0, Math.ceil((endsAt - now) / 1000)),
      window_seconds: Math.round(AUCTION_WINDOW_MS / 1000),
      demo_bidders: demoBiddersEnabled(),
    },
    changes,
  };
}

/**
 * Real suppliers' standing auto-bid rules. Runs once when a request opens.
 * These are genuine offers from genuine supplier accounts.
 */
export async function runAutoBidMatching(db, request) {
  const requirement = request.requirement || {};
  const rules = await db.collection('supplier_rules').find({ enabled: true }).toArray();

  const matching = rules.filter((rule) => {
    if (rule.brand && requirement.brand && rule.brand.toLowerCase() !== String(requirement.brand).toLowerCase()) return false;
    if (rule.sub_category && rule.sub_category !== 'any' && rule.sub_category !== requirement.sub_category) return false;
    if (rule.city && requirement.location && !String(requirement.location).toLowerCase().includes(rule.city.toLowerCase())) return false;
    if (rule.min_price && requirement.budget_inr && requirement.budget_inr < rule.min_price) return false;
    return true;
  });

  const created = [];
  for (const rule of matching) {
    const supplier = await db.collection('suppliers').findOne({ id: rule.supplier_id });
    if (!supplier || supplier.status !== 'approved') continue;
    // One auto-bid per supplier per request.
    const dupe = await db.collection('offers').findOne({ request_id: request.id, supplier_id: supplier.id });
    if (dupe) continue;

    const budget = requirement.budget_inr || rule.min_price || 50000;
    const discountPct = Number(rule.discount_pct) || 5;
    let price = Math.round((budget * (1 - discountPct / 100)) / 100) * 100;
    if (rule.min_price) price = Math.max(price, Number(rule.min_price));
    const days = Number(rule.delivery_days ?? 2);

    const offer = {
      id: uuidv4(),
      request_id: request.id,
      supplier_id: supplier.id,
      supplier_email: supplier.email || null,
      supplier_phone: supplier.phone || null,
      supplier_name: supplier.business_name + (supplier.city ? ' - ' + supplier.city : ''),
      supplier_type: supplier.supplier_type,
      price_inr: price,
      delivery_days: days,
      delivery_note: deliveryNote(days, supplier.city),
      warranty: rule.warranty || '1 year manufacturer',
      rating: supplier.rating || 4.5,
      reviews: supplier.reviews || 0,
      distance_km: null,
      validity_hours: Number(rule.validity_hours) || 24,
      extras: rule.extras || '',
      message: rule.message || 'Auto-bid via BoliBazzar Rules — best price locked in.',
      status: 'pending',
      source: 'auto_bid',
      auto_bid_rule_id: rule.id,
      created_at: new Date().toISOString(),
    };
    const scored = computeValueScore(offer, requirement);
    Object.assign(offer, scored);
    await db.collection('offers').insertOne(offer);
    notifyBuyerOfOffer(db, request, offer).catch(() => null);
    created.push(offer);
  }
  return created;
}
