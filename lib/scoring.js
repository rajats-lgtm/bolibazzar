/**
 * Deterministic offer scoring and buyer loyalty tiers.
 * No LLM calls here — ranking must be instant, free and reproducible.
 */

/**
 * Score an offer 0..100 against the buyer's requirement.
 * Weights: price 42%, delivery 14%, warranty 14%, extras 14%, rating 10%, distance 6%.
 */
export function computeValueScore(offer, requirement) {
  const budget = requirement?.budget_inr && requirement.budget_inr > 500 ? requirement.budget_inr : offer.price_inr;
  const priceRatio = budget > 0 ? offer.price_inr / budget : 1;
  const priceScore = Math.max(0, Math.min(1, 1 - (priceRatio - 0.85) / 0.2));
  const deliveryScore = Math.max(0, 1 - (Number(offer.delivery_days) || 0) / 5);
  const w = (offer.warranty || '').toLowerCase();
  const warrantyScore = w.includes('extended') || w.includes('2 year') ? 1 : w.includes('1 year') ? 0.7 : w.includes('6 month') ? 0.4 : 0.3;
  const ratingScore = Math.max(0, Math.min(1, ((Number(offer.rating) || 0) - 3.5) / 1.5));
  const ex = (offer.extras || '').toLowerCase();
  let extrasScore = 0;
  if (ex.includes('free')) extrasScore += 0.4;
  if (ex.includes('off') || ex.includes('cashback')) extrasScore += 0.3;
  if (ex.includes('emi') || ex.includes('no-cost')) extrasScore += 0.2;
  if (ex.includes('extended') || ex.includes('applecare')) extrasScore += 0.3;
  extrasScore = Math.min(1, extrasScore);
  const distScore = offer.distance_km != null ? Math.max(0, 1 - offer.distance_km / 15) : 0.5;

  const total =
    0.42 * priceScore +
    0.14 * deliveryScore +
    0.14 * warrantyScore +
    0.1 * ratingScore +
    0.14 * extrasScore +
    0.06 * distScore;

  const reasons = [];
  if (priceScore > 0.7) reasons.push('great price');
  if (deliveryScore >= 1) reasons.push('same-day delivery');
  else if (deliveryScore > 0.7) reasons.push('fast delivery');
  if (warrantyScore >= 0.9) reasons.push('extended warranty');
  if (extrasScore >= 0.6) reasons.push('valuable freebies');
  if (ratingScore >= 0.8) reasons.push('top-rated supplier');
  if (distScore >= 0.8) reasons.push('nearby store');
  if (!reasons.length) reasons.push('balanced offer');

  return { value_score: Math.round(total * 100), rationale: reasons.join(' · ') };
}

/** Rank offers and flag exactly one AI pick. Mutates nothing; returns a new array. */
export function rankOffers(offers, requirement) {
  const scored = offers.map((offer) => ({ ...offer, ...computeValueScore(offer, requirement) }));
  scored.sort((a, b) => b.value_score - a.value_score || a.price_inr - b.price_inr);
  return scored.map((offer, index) => ({ ...offer, ai_pick: index === 0 }));
}

export const TIERS = [
  { tier: 'platinum', label: 'Platinum', min: 200000, cashback_pct: 5, color: '#a5b4fc', badge_gradient: 'from-slate-300 to-indigo-300' },
  { tier: 'gold', label: 'Gold', min: 50000, cashback_pct: 3, color: '#fbbf24', badge_gradient: 'from-amber-400 to-yellow-300' },
  { tier: 'silver', label: 'Silver', min: 0, cashback_pct: 2, color: '#94a3b8', badge_gradient: 'from-slate-400 to-slate-300' },
];

export function computeTier(totalSpent) {
  const spent = Number(totalSpent) || 0;
  const index = TIERS.findIndex((t) => spent >= t.min);
  const current = TIERS[index];
  const next = index > 0 ? TIERS[index - 1] : null;
  return {
    tier: current.tier,
    label: current.label,
    cashback_pct: current.cashback_pct,
    color: current.color,
    badge_gradient: current.badge_gradient,
    total_spent_inr: spent,
    next_tier_at: next ? next.min : null,
    next_label: next ? next.label : null,
    progress_pct: next ? Math.min(100, Math.round((spent / next.min) * 100)) : 100,
  };
}

/** Approximate city centres, used for delivery route rendering. */
export const CITY_COORDS = {
  Mumbai: [19.076, 72.877], Delhi: [28.704, 77.102], Bengaluru: [12.972, 77.594], Bangalore: [12.972, 77.594],
  Chennai: [13.083, 80.27], Hyderabad: [17.385, 78.487], Pune: [18.52, 73.856], Kolkata: [22.573, 88.364],
  Ahmedabad: [23.023, 72.572], Jaipur: [26.912, 75.788], Surat: [21.17, 72.831], Lucknow: [26.847, 80.947],
  Kanpur: [26.449, 80.332], Nagpur: [21.146, 79.088], Indore: [22.72, 75.858], Bhopal: [23.259, 77.413],
  Coimbatore: [11.017, 76.956], Chandigarh: [30.734, 76.779], Kochi: [9.931, 76.267], Goa: [15.298, 74.124],
  Noida: [28.535, 77.391], Gurugram: [28.459, 77.027], Thane: [19.218, 72.978], Vadodara: [22.307, 73.181],
};

export function cityCoords(name) {
  if (!name) return null;
  const key = Object.keys(CITY_COORDS).find((c) => c.toLowerCase() === String(name).trim().toLowerCase());
  return key ? CITY_COORDS[key] : null;
}
