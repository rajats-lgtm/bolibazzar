import { v4 as uuidv4 } from 'uuid';
import { cityCoords, CITY_COORDS } from './scoring';
import { notifyOrderStage } from './notify';

/**
 * Order lifecycle and delivery tracking.
 *
 * An order is created when a payment verifies. It starts at `confirmed` — never
 * `delivered`. Suppliers advance stages themselves; for orders where nobody is
 * driving it (demo bidders), stages advance on a time schedule derived from the
 * promised delivery window, caught up lazily on read.
 */

export const STAGES = [
  { key: 'confirmed', label: 'Order confirmed', at: 0 },
  { key: 'packed', label: 'Packed at store', at: 0.15 },
  { key: 'shipped', label: 'Shipped', at: 0.35 },
  { key: 'out_for_delivery', label: 'Out for delivery', at: 0.8 },
  { key: 'delivered', label: 'Delivered', at: 1 },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);

const COURIERS = ['BoliBazzar Express', 'BlueDart', 'Delhivery', 'Ekart', 'Shadowfax'];

function stableIndex(text, modulo) {
  let hash = 0;
  for (let i = 0; i < String(text).length; i++) hash = (hash * 31 + String(text).charCodeAt(i)) % 100000;
  return hash % modulo;
}

/** Pull a city name out of a supplier label like "Croma - Andheri West". */
function supplierCity(offer, fallback = 'Mumbai') {
  const name = offer?.supplier_name || '';
  const afterDash = name.split(' - ')[1];
  if (afterDash) {
    const known = Object.keys(CITY_COORDS).find((c) => afterDash.toLowerCase().includes(c.toLowerCase()));
    if (known) return known;
  }
  const inName = Object.keys(CITY_COORDS).find((c) => name.toLowerCase().includes(c.toLowerCase()));
  return inName || offer?.supplier_city || fallback;
}

/** Create the order record for a verified payment. Idempotent per offer. */
export async function createOrder(db, { payment, offer, request }) {
  const existing = await db.collection('orders').findOne({ offer_id: offer.id }, { projection: { _id: 0 } });
  if (existing) return existing;

  const fromCity = supplierCity(offer);
  const toCity = request?.requirement?.location || fromCity;
  const days = Math.max(0, Number(offer.delivery_days) || 2);
  const placedAt = new Date();
  // A same-day promise still needs a few hours to run its stages.
  const windowMs = (days === 0 ? 0.35 : days) * 24 * 60 * 60 * 1000;

  const order = {
    id: uuidv4(),
    offer_id: offer.id,
    request_id: offer.request_id,
    payment_id: payment.id,
    buyer_email: payment.buyer_email || request?.buyer_email || null,
    buyer_name: request?.buyer_name || null,
    supplier_id: offer.supplier_id || null,
    supplier_email: offer.supplier_email || null,
    supplier_name: offer.supplier_name,
    product: request?.requirement?.product || request?.requirement?.summary || 'Order',
    amount_inr: payment.original_amount_inr || payment.amount_inr,
    paid_inr: payment.amount_inr,
    wallet_used_inr: payment.wallet_used_inr || 0,
    quantity: request?.requirement?.quantity || 1,
    stage: 'confirmed',
    auto_advance: offer.source === 'demo_bidder',
    from_city: fromCity,
    to_city: toCity,
    courier: COURIERS[stableIndex(offer.id, COURIERS.length)],
    tracking_id: 'BB' + String(offer.id).replace(/-/g, '').slice(0, 8).toUpperCase(),
    delivery_days: days,
    window_ms: windowMs,
    placed_at: placedAt.toISOString(),
    eta_at: new Date(placedAt.getTime() + windowMs).toISOString(),
    delivered_at: null,
    history: [{ stage: 'confirmed', label: 'Order confirmed', at: placedAt.toISOString(), by: 'system' }],
    created_at: placedAt.toISOString(),
  };
  await db.collection('orders').insertOne(order);
  return order;
}

/** Move an order to an explicit stage (supplier or admin action). */
export async function setOrderStage(db, order, stageKey, actor = 'supplier') {
  const index = STAGE_KEYS.indexOf(stageKey);
  if (index < 0) throw new Error('unknown stage');
  const currentIndex = STAGE_KEYS.indexOf(order.stage);
  if (index <= currentIndex) return order; // never move backwards

  const stage = STAGES[index];
  const now = new Date().toISOString();
  const update = {
    stage: stage.key,
    updated_at: now,
    ...(stage.key === 'delivered' ? { delivered_at: now } : {}),
  };
  await db.collection('orders').updateOne(
    { id: order.id },
    { $set: update, $push: { history: { stage: stage.key, label: stage.label, at: now, by: actor } } }
  );
  const updated = { ...order, ...update };
  notifyOrderStage(db, updated, stage).catch(() => null);
  return updated;
}

/**
 * Catch an auto-advancing order up to the current clock, then return the
 * tracking view. Manually-driven orders are left exactly where the supplier put
 * them.
 */
export async function trackOrder(db, order) {
  let current = order;

  if (current.auto_advance && current.stage !== 'delivered') {
    const placedAt = new Date(current.placed_at).getTime();
    const progress = current.window_ms > 0 ? (Date.now() - placedAt) / current.window_ms : 1;
    const due = STAGES.filter((s) => progress >= s.at).slice(-1)[0];
    if (due && STAGE_KEYS.indexOf(due.key) > STAGE_KEYS.indexOf(current.stage)) {
      current = await setOrderStage(db, current, due.key, 'system');
    }
  }

  const placedAt = new Date(current.placed_at).getTime();
  const elapsed = Date.now() - placedAt;
  const stageIndex = STAGE_KEYS.indexOf(current.stage);
  const delivered = current.stage === 'delivered';
  // Once delivered the journey is complete regardless of the clock.
  const progress = delivered ? 1 : Math.max(0, Math.min(0.99, current.window_ms > 0 ? elapsed / current.window_ms : 0));

  const from = cityCoords(current.from_city) || CITY_COORDS.Mumbai;
  const to = cityCoords(current.to_city) || from;
  const currentCoords = [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress];
  const remainMs = delivered ? 0 : Math.max(0, current.window_ms - elapsed);

  return {
    order_id: current.id,
    offer_id: current.offer_id,
    tracking_id: current.tracking_id,
    courier: current.courier,
    stage: current.stage,
    stage_index: stageIndex,
    stages: STAGES,
    history: current.history || [],
    progress: Math.round(progress * 100),
    from_city: current.from_city,
    to_city: current.to_city,
    from_coords: from,
    to_coords: to,
    current_coords: currentCoords,
    eta_minutes: Math.round(remainMs / 60000),
    eta_days: Math.ceil(remainMs / (60 * 60 * 24 * 1000)),
    eta_at: current.eta_at,
    delivered,
    delivered_at: current.delivered_at || null,
    amount_inr: current.amount_inr,
    product: current.product,
    supplier_name: current.supplier_name,
    auto_advance: !!current.auto_advance,
  };
}

export async function findOrderByOffer(db, offerId) {
  return db.collection('orders').findOne({ offer_id: offerId }, { projection: { _id: 0 } });
}
