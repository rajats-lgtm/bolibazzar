export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '@/lib/mongo';
import { llm, MODEL_EXTRACT } from '@/lib/llm';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function ok(data, status = 200) { return NextResponse.json(data, { status, headers: cors }); }
function err(m, status = 400, extra = {}) { return NextResponse.json({ error: m, ...extra }, { status, headers: cors }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

// --- AI extract ---
async function extractRequirement(text) {
  const system = `You are BoliBazaar's AI buying assistant for the Indian electronics market. Extract a structured buying requirement from the user's message. Return STRICT JSON only.

The user may write in English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, or a mix (Hinglish/Tanglish). UNDERSTAND ALL and always extract the SAME normalized JSON schema in English keys.

Schema:
{
  "category": "electronics",
  "sub_category": string (smartphone|laptop|tablet|tv|gaming_console|smartwatch|headphones|camera|accessory|other),
  "product": string (in English),
  "brand": string|null, "model": string|null, "storage": string|null, "ram": string|null,
  "colour": string|null (in English), "size": string|null,
  "budget_inr": number|null,
  "location": string|null (in English/Latin),
  "delivery_preference": string|null,
  "quantity": number,
  "additional_notes": string|null,
  "summary": string (one crisp sentence, ECHO in the same language the user used),
  "detected_language": string ("en"|"hi"|"ta"|"te"|"bn"|"mr"|"kn"|"ml"|"gu"|"mixed"),
  "confidence": number 0..1
}
Rules:
- All prices in INR. Convert lakh/lakhs (=100000), crore (=10000000), k/hazaar (=1000).
- quantity defaults 1.
- Hindi numeric words: "bees hazaar"=20000, "ek lakh"=100000, etc.
- summary should be natural in the user's language e.g. Hindi: "1 lakh 20 hazaar ke andar iPhone 17 Pro Max Mumbai mein"`;
  const resp = await llm.chat.completions.create({
    model: MODEL_EXTRACT,
    messages: [ { role: 'system', content: system }, { role: 'user', content: text } ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const parsed = JSON.parse(resp.choices?.[0]?.message?.content || '{}');
  if (!parsed.quantity || parsed.quantity < 1) parsed.quantity = 1;
  parsed.category = 'electronics';
  return parsed;
}

// --- WhatsApp alerts (Twilio-ready, mock fallback) ---
function hasWhatsApp() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.WHATSAPP_FROM);
}
async function sendWhatsApp(toE164, body) {
  if (!hasWhatsApp()) {
    console.log('[whatsapp:mock]', toE164, '\u2192', body.slice(0, 120));
    return { mocked: true, to: toE164 };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const form = new URLSearchParams({ From: process.env.WHATSAPP_FROM, To: `whatsapp:${toE164}`, Body: body });
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || 'Twilio send failed');
  return { mocked: false, sid: d.sid };
}
async function notifyMatchingSuppliers(db, request) {
  const brands = [request.requirement.brand].filter(Boolean);
  const suppliers = await db.collection('suppliers').find({ status: 'approved' }).limit(50).toArray();
  const matches = suppliers.filter(s => brands.length === 0 || (s.brand_authorisations || []).length === 0 || (s.brand_authorisations || []).some(b => brands.some(x => x.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(x.toLowerCase()))));
  const summary = request.requirement.summary || request.requirement.product;
  const link = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/`;
  const body = `\u{1F514} New buyer request on BoliBazzar!\n\n${summary}\n\nBudget: ${request.requirement.budget_inr ? '\u20B9' + request.requirement.budget_inr.toLocaleString('en-IN') : 'flexible'}\nLocation: ${request.requirement.location || 'India'}\nQty: ${request.requirement.quantity}\n\nOpen dashboard: ${link}`;
  const results = [];
  for (const s of matches) {
    if (!s.phone) { results.push({ supplier_id: s.id, business_name: s.business_name, skipped: 'no phone' }); continue; }
    try { const r = await sendWhatsApp(s.phone, body); results.push({ supplier_id: s.id, business_name: s.business_name, ...r }); }
    catch (e) { results.push({ supplier_id: s.id, business_name: s.business_name, error: e.message }); }
  }
  await db.collection('whatsapp_log').insertOne({ id: uuidv4(), request_id: request.id, sent_to: results, body, created_at: new Date().toISOString() });
  return results;
}

// --- Value score (deterministic, no LLM cost) ---
function computeValueScore(offer, requirement) {
  const budget = requirement.budget_inr && requirement.budget_inr > 500 ? requirement.budget_inr : offer.price_inr;
  const priceRatio = offer.price_inr / budget;
  const priceScore = Math.max(0, Math.min(1, 1 - (priceRatio - 0.85) / 0.20));
  const deliveryScore = Math.max(0, 1 - offer.delivery_days / 5);
  const w = (offer.warranty || '').toLowerCase();
  const warrantyScore = w.includes('extended') || w.includes('2 year') ? 1 : w.includes('1 year') ? 0.7 : w.includes('6 month') ? 0.4 : 0.3;
  const ratingScore = Math.max(0, Math.min(1, (offer.rating - 3.5) / 1.5));
  const ex = (offer.extras || '').toLowerCase();
  let extrasScore = 0;
  if (ex.includes('free')) extrasScore += 0.4;
  if (ex.includes('off') || ex.includes('cashback')) extrasScore += 0.3;
  if (ex.includes('emi') || ex.includes('no-cost')) extrasScore += 0.2;
  if (ex.includes('extended') || ex.includes('applecare')) extrasScore += 0.3;
  extrasScore = Math.min(1, extrasScore);
  const distScore = offer.distance_km != null ? Math.max(0, 1 - offer.distance_km / 15) : 0.5;
  const total = 0.42*priceScore + 0.14*deliveryScore + 0.14*warrantyScore + 0.10*ratingScore + 0.14*extrasScore + 0.06*distScore;
  const reasons = [];
  if (priceScore > 0.7) reasons.push('great price');
  if (deliveryScore >= 1) reasons.push('same-day delivery');
  else if (deliveryScore > 0.7) reasons.push('fast delivery');
  if (warrantyScore >= 0.9) reasons.push('extended warranty');
  if (extrasScore >= 0.6) reasons.push('valuable freebies');
  if (ratingScore >= 0.8) reasons.push('top-rated supplier');
  if (distScore >= 0.8) reasons.push('nearby store');
  if (!reasons.length) reasons.push('balanced offer');
  return { value_score: Math.round(total * 100), rationale: reasons.join(' \u00b7 ') };
}

// --- Auto-bid matching (supplier rules -> auto-generated offers) ---
async function runAutoBidMatching(db, request) {
  const rules = await db.collection('supplier_rules').find({ enabled: true }).toArray();
  const req = request.requirement;
  const matches = rules.filter(rule => {
    if (rule.brand && req.brand && rule.brand.toLowerCase() !== req.brand.toLowerCase()) return false;
    if (rule.sub_category && rule.sub_category !== 'any' && rule.sub_category !== req.sub_category) return false;
    if (rule.city && req.location && !req.location.toLowerCase().includes(rule.city.toLowerCase())) return false;
    // Budget must be at or above rule's minimum acceptable
    if (rule.min_price && req.budget_inr && req.budget_inr < rule.min_price) return false;
    return true;
  });
  const offers = [];
  for (const rule of matches) {
    const supplier = await db.collection('suppliers').findOne({ id: rule.supplier_id });
    if (!supplier || supplier.status !== 'approved') continue;
    // Compute auto-bid price
    const budget = req.budget_inr || rule.min_price || 50000;
    const discountPct = rule.discount_pct || 5;
    let price = Math.round((budget * (1 - discountPct / 100)) / 100) * 100;
    if (rule.min_price) price = Math.max(price, rule.min_price);
    const offer = {
      id: uuidv4(), request_id: request.id,
      supplier_id: supplier.id,
      supplier_name: supplier.business_name + (supplier.city ? ' - ' + supplier.city : ''),
      supplier_type: supplier.supplier_type,
      price_inr: price,
      delivery_days: rule.delivery_days || 2,
      delivery_note: rule.delivery_days === 0 ? `Same-day in ${supplier.city}` : (rule.delivery_days || 2) === 1 ? 'Next-day delivery' : `${rule.delivery_days || 2}-day shipping`,
      warranty: rule.warranty || '1 year manufacturer',
      rating: supplier.rating || 4.5, reviews: supplier.reviews || 0,
      distance_km: null,
      validity_hours: rule.validity_hours || 24,
      extras: rule.extras || '',
      message: rule.message || 'Auto-bid via BoliBazaar Rules — best price locked in.',
      status: 'pending',
      source: 'auto_bid',
      auto_bid_rule_id: rule.id,
      created_at: new Date().toISOString(),
    };
    const scored = computeValueScore(offer, req);
    Object.assign(offer, scored);
    await db.collection('offers').insertOne(offer);
    offers.push(offer);
  }
  return offers;
}

// --- Loyalty tiers ---
function computeTier(totalSpent) {
  const s = Number(totalSpent) || 0;
  if (s >= 200000) return { tier: 'platinum', label: 'Platinum', cashback_pct: 5, color: '#a5b4fc', badge_gradient: 'from-slate-300 to-indigo-300', next_tier_at: null, next_label: null };
  if (s >= 50000) return { tier: 'gold', label: 'Gold', cashback_pct: 3, color: '#fbbf24', badge_gradient: 'from-amber-400 to-yellow-300', next_tier_at: 200000, next_label: 'Platinum' };
  return { tier: 'silver', label: 'Silver', cashback_pct: 2, color: '#94a3b8', badge_gradient: 'from-slate-400 to-slate-300', next_tier_at: 50000, next_label: 'Gold' };
}

// --- City coordinates for delivery map (India) ---
const CITY_COORDS = {
  Mumbai: [19.076, 72.877], Delhi: [28.704, 77.102], Bengaluru: [12.972, 77.594], Bangalore: [12.972, 77.594],
  Chennai: [13.083, 80.270], Hyderabad: [17.385, 78.487], Pune: [18.520, 73.856], Kolkata: [22.573, 88.364],
  Ahmedabad: [23.023, 72.572], Jaipur: [26.912, 75.788], Surat: [21.170, 72.831], Lucknow: [26.847, 80.947],
  Kanpur: [26.449, 80.332], Nagpur: [21.146, 79.088], Indore: [22.720, 75.858], Bhopal: [23.259, 77.413],
  Coimbatore: [11.017, 76.956], Chandigarh: [30.734, 76.779], Kochi: [9.931, 76.267], Goa: [15.298, 74.124],
};

// --- Delivery ETA/status ---
async function deliveryStatus(db, offerId) {
  const offer = await db.collection('offers').findOne({ id: offerId });
  if (!offer) return null;
  const request = await db.collection('requests').findOne({ id: offer.request_id });
  const payment = await db.collection('payments').findOne({ offer_id: offerId, status: 'paid' });
  const paidAt = payment?.verified_at ? new Date(payment.verified_at).getTime() : Date.now();
  const totalMs = Math.max(1, (offer.delivery_days || 2)) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const elapsed = now - paidAt;
  const progress = Math.min(1, elapsed / totalMs);
  const stages = [
    { key: 'confirmed', label: 'Order confirmed', at: 0 },
    { key: 'packed', label: 'Packed at store', at: 0.15 },
    { key: 'shipped', label: 'Shipped', at: 0.35 },
    { key: 'out_for_delivery', label: 'Out for delivery', at: 0.80 },
    { key: 'delivered', label: 'Delivered', at: 1.0 },
  ];
  const currentStage = stages.filter(s => progress >= s.at).slice(-1)[0] || stages[0];
  const stageIndex = stages.findIndex(s => s.key === currentStage.key);
  const remainMs = Math.max(0, totalMs - elapsed);
  const remainMin = Math.round(remainMs / 60000);
  // Location: supplier city -> buyer city
  const supplierCity = (offer.supplier_name || '').split(' - ')[1] || (offer.supplier_name || '').match(/(Mumbai|Delhi|Bengaluru|Bangalore|Chennai|Hyderabad|Pune|Kolkata|Ahmedabad|Jaipur|Chandigarh|Kochi|Goa|Coimbatore)/i)?.[0] || 'Mumbai';
  const buyerCity = request?.requirement?.location || supplierCity;
  const from = CITY_COORDS[supplierCity] || CITY_COORDS.Mumbai;
  const to = CITY_COORDS[buyerCity] || from;
  const cur = [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress];
  return {
    offer_id: offerId,
    stage: currentStage.key,
    stage_index: stageIndex,
    stages,
    progress: Math.round(progress * 100),
    from_city: supplierCity, to_city: buyerCity,
    from_coords: from, to_coords: to, current_coords: cur,
    eta_minutes: remainMin,
    eta_days: Math.ceil(remainMin / (60 * 24)),
    delivered: progress >= 1,
    courier: ['BoliBazaar Express', 'BlueDart', 'Delhivery', 'Ekart', 'Shadowfax'][Math.floor((offerId.charCodeAt(0) + offerId.charCodeAt(1)) % 5)],
    tracking_id: 'BB' + offerId.slice(0, 8).toUpperCase(),
  };
}

// --- Deterministic offer simulation ---
const SUPPLIER_POOL = [
  { name: 'Croma - Andheri West', type: 'retail_store', rating: 4.6, reviews: 3240, city: 'Mumbai', dist: 2.4 },
  { name: 'Reliance Digital - BKC', type: 'retail_store', rating: 4.5, reviews: 4890, city: 'Mumbai', dist: 5.1 },
  { name: 'Vijay Sales - Dadar', type: 'retail_store', rating: 4.4, reviews: 2110, city: 'Mumbai', dist: 7.8 },
  { name: 'Poorvika Mobiles', type: 'authorised_reseller', rating: 4.7, reviews: 5200, city: 'Bengaluru', dist: 3.2 },
  { name: 'Sangeetha Mobiles', type: 'authorised_reseller', rating: 4.5, reviews: 3980, city: 'Bengaluru', dist: 6.4 },
  { name: 'iPlanet Bengaluru', type: 'brand_store', rating: 4.8, reviews: 1290, city: 'Bengaluru', dist: 4.5 },
  { name: 'Unicorn Store - Delhi', type: 'brand_store', rating: 4.8, reviews: 1780, city: 'Delhi', dist: 8.9 },
  { name: 'Bajaj Electronics', type: 'retail_store', rating: 4.4, reviews: 2560, city: 'Hyderabad', dist: 4.1 },
  { name: 'Girias Chennai', type: 'retail_store', rating: 4.5, reviews: 1890, city: 'Chennai', dist: 5.7 },
  { name: 'Ezone Electronics', type: 'retail_store', rating: 4.3, reviews: 1450, city: 'Pune', dist: 3.9 },
];
const EXTRAS = ['Free tempered glass + case', 'Instant HDFC 10% off (max ₹5,000)', 'Free AirPods 4 with purchase', 'No-cost EMI up to 12 months', 'Free 1-year AppleCare+ upgrade', 'Free shipping + free installation', '₹3,000 exchange bonus on old device', 'Complimentary 20W adapter + cable'];
function pickN(a, n) { const c = [...a]; const o = []; for (let i = 0; i < n && c.length; i++) o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]); return o; }
function rand(a, b) { return Math.random()*(b-a)+a; }
function simulateOffers(requirement) {
  const defaults = { smartphone: 80000, laptop: 90000, tablet: 45000, tv: 60000, gaming_console: 55000, smartwatch: 30000, headphones: 20000, camera: 70000, accessory: 5000, other: 25000 };
  const base = requirement.budget_inr && requirement.budget_inr > 500 ? requirement.budget_inr : (defaults[requirement.sub_category] || 40000);
  const loc = (requirement.location || '').toLowerCase();
  const pool = [...SUPPLIER_POOL].sort((a, b) => ((b.city && loc.includes(b.city.toLowerCase())) ? 1 : 0) - ((a.city && loc.includes(a.city.toLowerCase())) ? 1 : 0));
  const suppliers = pool.slice(0, 3).concat(pickN(pool.slice(3), 2));
  const vars = [0.88, 0.93, 0.96, 0.99, 1.02].sort(() => Math.random() - 0.5);
  return suppliers.map((s, i) => {
    const price = Math.round((base * vars[i]) / 100) * 100;
    const dd = i === 0 ? 0 : Math.max(1, Math.round(rand(1, 5)));
    return {
      supplier_name: s.name, supplier_type: s.type, price_inr: price,
      delivery_days: dd,
      delivery_note: dd === 0 ? `Same-day delivery in ${s.city}` : dd <= 2 ? 'Next-day delivery' : `${dd}-day pan-India shipping`,
      warranty: s.type === 'brand_store' ? '1 year manufacturer + 6 months BoliBazaar extended' : s.type === 'authorised_reseller' ? '1 year manufacturer + on-site pickup' : '1 year manufacturer',
      rating: s.rating, reviews: s.reviews, distance_km: s.dist,
      validity_hours: [6,12,24,48][Math.floor(Math.random()*4)],
      extras: pickN(EXTRAS, 1)[0],
      message: 'In stock and ready to dispatch. Best price in ' + (s.city || 'India') + ' guaranteed.',
    };
  });
}

// --- Razorpay ---
function hasRazorpay() { return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET); }
async function createRazorpayOrder(amount, receipt) {
  if (!hasRazorpay()) {
    return { orderId: 'mock_order_' + uuidv4().slice(0, 12), amount, currency: 'INR', mocked: true };
  }
  const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR', receipt }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.description || 'Razorpay order creation failed');
  return { orderId: d.id, amount: d.amount, currency: d.currency, mocked: false };
}
function verifyRazorpaySignature({ order_id, payment_id, signature }) {
  if (!hasRazorpay()) return true;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(order_id + '|' + payment_id).digest('hex');
  return expected === signature;
}

// --- Router ---
async function route(req, { params }) {
  const p = await params;
  const path = '/' + (p?.path || []).join('/');
  const method = req.method;
  const db = await getDb();

  if (path === '/' || path === '/health') return ok({ status: 'ok', service: 'BoliBazaar API', razorpay_live: hasRazorpay() });

  // --- Auth (lightweight session) ---
  if (path === '/auth/session' && method === 'POST') {
    const { name, email, picture } = await req.json();
    if (!name || !email) return err('name and email required');
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      await db.collection('users').updateOne({ email }, { $set: { name, picture: picture || existing.picture, last_login: new Date().toISOString() } });
      const u = await db.collection('users').findOne({ email }, { projection: { _id: 0 } });
      return ok({ user: u });
    }
    const user = { id: uuidv4(), name, email, picture: picture || null, role: 'buyer', created_at: new Date().toISOString(), last_login: new Date().toISOString() };
    await db.collection('users').insertOne(user);
    return ok({ user });
  }

  const meMatch = path.match(/^\/me\/(.+)$/);
  if (meMatch && method === 'GET') {
    const email = decodeURIComponent(meMatch[1]);
    const user = await db.collection('users').findOne({ email }, { projection: { _id: 0 } });
    if (!user) return err('not found', 404);
    const requests = await db.collection('requests').find({ buyer_email: email }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray();
    const tier = computeTier(user.total_spent_inr || 0);
    return ok({ user: { ...user, tier }, requests });
  }

  // --- Suppliers ---
  if (path === '/suppliers' && method === 'POST') {
    const b = await req.json();
    if (!b.business_name || !b.gst || !b.email) return err('business_name, gst, email required');
    const gstRe = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const gst_valid = gstRe.test((b.gst || '').toUpperCase());
    const supplier = {
      id: uuidv4(),
      business_name: b.business_name, gst: b.gst.toUpperCase(), gst_valid,
      email: b.email, phone: b.phone || null,
      address: b.address || '', city: b.city || '', pincode: b.pincode || '',
      categories: b.categories || ['electronics'],
      brand_authorisations: b.brand_authorisations || [],
      supplier_type: b.supplier_type || 'retail_store',
      status: gst_valid ? 'approved' : 'pending_review',
      rating: 4.5, reviews: 0,
      created_at: new Date().toISOString(),
    };
    await db.collection('suppliers').insertOne(supplier);
    return ok({ supplier });
  }
  if (path === '/suppliers' && method === 'GET') {
    const list = await db.collection('suppliers').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    return ok({ suppliers: list });
  }

  // --- Requests ---
  if (path === '/extract' && method === 'POST') {
    const { text } = await req.json();
    if (!text?.trim()) return err('text is required');
    try {
      const requirement = await extractRequirement(text);
      return ok({ requirement });
    } catch (e) { console.error('extract', e); return err('AI extraction failed: ' + (e.message || 'unknown'), 500); }
  }
  if (path === '/requests' && method === 'POST') {
    const body = await req.json();
    if (!body.requirement) return err('requirement required');
    const doc = {
      id: uuidv4(),
      buyer_name: body.buyer_name || 'Guest Buyer',
      buyer_email: body.buyer_email || null,
      raw_text: body.raw_text || '',
      requirement: body.requirement,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    await db.collection('requests').insertOne(doc);
    // Fire-and-forget WhatsApp alerts + auto-bid matching
    notifyMatchingSuppliers(db, doc).catch(e => console.error('whatsapp notify', e));
    runAutoBidMatching(db, doc).catch(e => console.error('auto-bid', e));
    return ok({ request: doc });
  }
  if (path === '/requests' && method === 'GET') {
    const list = await db.collection('requests').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray();
    return ok({ requests: list });
  }
  const reqMatch = path.match(/^\/requests\/([^/]+)$/);
  if (reqMatch && method === 'GET') {
    const id = reqMatch[1];
    const doc = await db.collection('requests').findOne({ id }, { projection: { _id: 0 } });
    if (!doc) return err('not found', 404);
    const offers = await db.collection('offers').find({ request_id: id }, { projection: { _id: 0 } }).sort({ value_score: -1, price_inr: 1 }).toArray();
    return ok({ request: doc, offers });
  }
  const simMatch = path.match(/^\/requests\/([^/]+)\/simulate$/);
  if (simMatch && method === 'POST') {
    const id = simMatch[1];
    const reqDoc = await db.collection('requests').findOne({ id });
    if (!reqDoc) return err('request not found', 404);
    const offers = simulateOffers(reqDoc.requirement);
    const withIds = offers.map(o => {
      const scored = computeValueScore(o, reqDoc.requirement);
      return { id: uuidv4(), request_id: id, ...o, ...scored, status: 'pending', source: 'ai_simulated', created_at: new Date().toISOString() };
    });
    // Sort by value_score descending, mark top as ai_pick
    withIds.sort((a, b) => b.value_score - a.value_score);
    if (withIds[0]) withIds[0].ai_pick = true;
    if (withIds.length) await db.collection('offers').insertMany(withIds);
    return ok({ offers: withIds });
  }
  const offerMatch = path.match(/^\/requests\/([^/]+)\/offers$/);
  if (offerMatch && method === 'POST') {
    const id = offerMatch[1];
    const b = await req.json();
    const reqDoc = await db.collection('requests').findOne({ id });
    if (!reqDoc) return err('request not found', 404);
    const offer = {
      id: uuidv4(), request_id: id,
      supplier_id: b.supplier_id || null,
      supplier_name: b.supplier_name || 'Unknown Supplier',
      supplier_type: b.supplier_type || 'retail_store',
      price_inr: Number(b.price_inr) || 0,
      delivery_days: Number(b.delivery_days) || 3,
      delivery_note: b.delivery_note || 'Standard delivery',
      warranty: b.warranty || '1 year manufacturer',
      rating: Number(b.rating) || 4.5, reviews: Number(b.reviews) || 100,
      distance_km: b.distance_km ? Number(b.distance_km) : null,
      validity_hours: Number(b.validity_hours) || 24,
      extras: b.extras || '', message: b.message || '',
      status: 'pending', source: 'supplier_manual',
      created_at: new Date().toISOString(),
    };
    await db.collection('offers').insertOne(offer);
    return ok({ offer });
  }
  const acceptMatch = path.match(/^\/offers\/([^/]+)\/accept$/);
  if (acceptMatch && method === 'POST') {
    const offerId = acceptMatch[1];
    const offer = await db.collection('offers').findOne({ id: offerId });
    if (!offer) return err('offer not found', 404);
    await db.collection('offers').updateOne({ id: offerId }, { $set: { status: 'accepted' } });
    await db.collection('offers').updateMany({ request_id: offer.request_id, id: { $ne: offerId } }, { $set: { status: 'rejected' } });
    await db.collection('requests').updateOne({ id: offer.request_id }, { $set: { status: 'closed', accepted_offer_id: offerId } });
    return ok({ ok: true });
  }

  // --- Chat ---
  if (path === '/messages' && method === 'POST') {
    const b = await req.json();
    if (!b.offer_id || !b.text) return err('offer_id and text required');
    const msg = {
      id: uuidv4(),
      offer_id: b.offer_id,
      sender: b.sender || 'buyer',
      sender_name: b.sender_name || 'Buyer',
      text: b.text,
      read: false,
      created_at: new Date().toISOString(),
    };
    await db.collection('messages').insertOne(msg);
    return ok({ message: msg });
  }
  const msgMatch = path.match(/^\/messages\/([^/]+)$/);
  if (msgMatch && method === 'GET') {
    const offerId = msgMatch[1];
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const q = { offer_id: offerId };
    if (since) q.created_at = { $gt: since };
    const list = await db.collection('messages').find(q, { projection: { _id: 0 } }).sort({ created_at: 1 }).toArray();
    return ok({ messages: list });
  }
  const readMatch = path.match(/^\/messages\/([^/]+)\/read$/);
  if (readMatch && method === 'POST') {
    const offerId = readMatch[1];
    const { sender } = await req.json();
    // mark messages from other party as read
    const other = sender === 'buyer' ? 'supplier' : 'buyer';
    await db.collection('messages').updateMany({ offer_id: offerId, sender: other, read: false }, { $set: { read: true, read_at: new Date().toISOString() } });
    return ok({ ok: true });
  }

  // --- Payments ---
  if (path === '/payments/order' && method === 'POST') {
    const { offer_id, amount_inr, buyer_email, wallet_apply_inr } = await req.json();
    if (!offer_id || !amount_inr) return err('offer_id and amount_inr required');
    // Deduct wallet balance if requested
    let walletUsed = 0;
    if (buyer_email && wallet_apply_inr && wallet_apply_inr > 0) {
      const w = await db.collection('wallets').findOne({ email: buyer_email });
      if (w && w.balance_inr > 0) {
        walletUsed = Math.min(w.balance_inr, Number(wallet_apply_inr), Number(amount_inr) - 1);
      }
    }
    const finalAmount = Number(amount_inr) - walletUsed;
    const receipt = 'BB_' + offer_id.slice(0, 8) + '_' + Date.now();
    const amountPaise = Math.round(finalAmount * 100);
    try {
      const order = await createRazorpayOrder(amountPaise, receipt);
      const payment = {
        id: uuidv4(),
        offer_id, receipt,
        buyer_email: buyer_email || null,
        amount_inr: finalAmount, amount_paise: amountPaise,
        original_amount_inr: Number(amount_inr),
        wallet_used_inr: walletUsed,
        razorpay_order_id: order.orderId,
        status: 'created',
        mocked: order.mocked,
        created_at: new Date().toISOString(),
      };
      await db.collection('payments').insertOne(payment);
      return ok({
        order_id: order.orderId,
        amount: order.amount, currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID || null,
        mocked: order.mocked,
        wallet_used_inr: walletUsed,
        final_amount_inr: finalAmount,
      });
    } catch (e) { console.error('order', e); return err('order failed: ' + (e.message || 'unknown'), 500); }
  }
  if (path === '/payments/verify' && method === 'POST') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    const paymentDoc = await db.collection('payments').findOne({ razorpay_order_id });
    if (!paymentDoc) return err('payment not found', 404);
    let valid = true;
    if (!paymentDoc.mocked) {
      valid = verifyRazorpaySignature({ order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature });
    }
    const status = valid ? 'paid' : 'signature_failed';
    await db.collection('payments').updateOne({ razorpay_order_id }, { $set: { status, razorpay_payment_id, razorpay_signature: razorpay_signature || null, verified_at: new Date().toISOString() } });
    if (valid) {
      await db.collection('offers').updateOne({ id: paymentDoc.offer_id }, { $set: { payment_status: 'paid', delivery_status: 'delivered' } });
      // Wallet accounting + tier update
      if (paymentDoc.buyer_email) {
        const email = paymentDoc.buyer_email;
        const user = await db.collection('users').findOne({ email });
        const currentSpent = (user?.total_spent_inr || 0);
        const newSpent = currentSpent + (paymentDoc.original_amount_inr || paymentDoc.amount_inr);
        const tier = computeTier(newSpent);
        if (user) {
          await db.collection('users').updateOne({ email }, { $set: { total_spent_inr: newSpent, tier: tier.tier } });
        }
        let w = await db.collection('wallets').findOne({ email });
        if (!w) { w = { email, balance_inr: 0, transactions: [], created_at: new Date().toISOString() }; await db.collection('wallets').insertOne({ ...w }); }
        const now = new Date().toISOString();
        const used = paymentDoc.wallet_used_inr || 0;
        const cashback = Math.round((paymentDoc.original_amount_inr || paymentDoc.amount_inr) * (tier.cashback_pct / 100));
        const txs = [];
        if (used > 0) txs.push({ id: uuidv4(), type: 'debit', amount: used, reason: 'Wallet applied on purchase', offer_id: paymentDoc.offer_id, at: now });
        txs.push({ id: uuidv4(), type: 'credit', amount: cashback, reason: `${tier.cashback_pct}% ${tier.label} cashback`, offer_id: paymentDoc.offer_id, at: now });
        const newBal = (w.balance_inr || 0) - used + cashback;
        await db.collection('wallets').updateOne({ email }, { $set: { balance_inr: newBal }, $push: { transactions: { $each: txs } } });
      }
    }
    return ok({ ok: valid, status });
  }

  // --- Reviews ---
  if (path === '/reviews' && method === 'POST') {
    const b = await req.json();
    if (!b.offer_id || !b.rating) return err('offer_id and rating required');
    const offer = await db.collection('offers').findOne({ id: b.offer_id });
    if (!offer) return err('offer not found', 404);
    const review = {
      id: uuidv4(),
      offer_id: b.offer_id,
      request_id: offer.request_id,
      supplier_name: offer.supplier_name,
      supplier_id: offer.supplier_id || null,
      buyer_name: b.buyer_name || 'Buyer',
      buyer_email: b.buyer_email || null,
      rating: Math.max(1, Math.min(5, Number(b.rating))),
      title: b.title || '',
      comment: b.comment || '',
      tags: b.tags || [],
      created_at: new Date().toISOString(),
    };
    await db.collection('reviews').insertOne(review);
    // Update the offer with review
    await db.collection('offers').updateOne({ id: b.offer_id }, { $set: { reviewed: true, review_rating: review.rating } });
    // Recompute supplier aggregate rating (if supplier_id present)
    if (offer.supplier_id) {
      const all = await db.collection('reviews').find({ supplier_id: offer.supplier_id }).toArray();
      const avg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1);
      await db.collection('suppliers').updateOne({ id: offer.supplier_id }, { $set: { rating: Math.round(avg * 10) / 10, reviews: all.length } });
    }
    return ok({ review });
  }
  const revListMatch = path.match(/^\/reviews\/supplier\/(.+)$/);
  if (revListMatch && method === 'GET') {
    const supplierId = revListMatch[1];
    const list = await db.collection('reviews').find({ supplier_id: supplierId }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    return ok({ reviews: list });
  }
  const revOfferMatch = path.match(/^\/reviews\/offer\/([^/]+)$/);
  if (revOfferMatch && method === 'GET') {
    const offerId = revOfferMatch[1];
    const r = await db.collection('reviews').findOne({ offer_id: offerId }, { projection: { _id: 0 } });
    return ok({ review: r || null });
  }

  // --- WhatsApp log (for debugging + admin dashboard) ---
  if (path === '/whatsapp/log' && method === 'GET') {
    const list = await db.collection('whatsapp_log').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(20).toArray();
    return ok({ log: list, live: hasWhatsApp() });
  }

  // --- Bidding: tick to drop prices during 60s auction window ---
  const tickMatch = path.match(/^\/requests\/([^/]+)\/tick$/);
  if (tickMatch && method === 'POST') {
    const id = tickMatch[1];
    const reqDoc = await db.collection('requests').findOne({ id });
    if (!reqDoc) return err('request not found', 404);
    const offers = await db.collection('offers').find({ request_id: id, status: 'pending' }).toArray();
    if (!offers.length) return ok({ offers: [] });
    // Randomly pick 1-2 offers to drop their price 1-3%
    const shuffled = offers.sort(() => Math.random() - 0.5);
    const dropCount = Math.min(2, shuffled.length);
    const updated = [];
    for (let i = 0; i < dropCount; i++) {
      const o = shuffled[i];
      const dropPct = 0.01 + Math.random() * 0.02; // 1-3%
      const newPrice = Math.round((o.price_inr * (1 - dropPct)) / 100) * 100;
      if (newPrice < o.price_inr) {
        const scored = computeValueScore({ ...o, price_inr: newPrice }, reqDoc.requirement);
        await db.collection('offers').updateOne({ id: o.id }, { $set: { price_inr: newPrice, previous_price: o.price_inr, value_score: scored.value_score, rationale: scored.rationale, last_bid_at: new Date().toISOString() } });
        updated.push({ id: o.id, old_price: o.price_inr, new_price: newPrice });
      }
    }
    // Return all offers freshly, resorted, with new ai_pick
    const fresh = await db.collection('offers').find({ request_id: id }, { projection: { _id: 0 } }).sort({ value_score: -1, price_inr: 1 }).toArray();
    fresh.forEach((o, i) => { o.ai_pick = (i === 0); });
    // Also update the DB to reflect new ai_pick
    for (const o of fresh) {
      await db.collection('offers').updateOne({ id: o.id }, { $set: { ai_pick: o.ai_pick } });
    }
    return ok({ offers: fresh, dropped: updated });
  }

  // --- Supplier analytics ---
  const analyticsMatch = path.match(/^\/analytics\/supplier\/(.+)$/);
  if (analyticsMatch && method === 'GET') {
    const email = decodeURIComponent(analyticsMatch[1]);
    const supplier = await db.collection('suppliers').findOne({ email }, { projection: { _id: 0 } });
    // Total open + closed requests seen by system
    const totalReq = await db.collection('requests').countDocuments({});
    const openReq = await db.collection('requests').countDocuments({ status: 'open' });
    // Their offers (match by supplier_id if present, else supplier_name contains business_name)
    let myOfferQuery = {};
    if (supplier) {
      myOfferQuery = { $or: [ { supplier_id: supplier.id }, { supplier_name: { $regex: supplier.business_name.split(' ')[0], $options: 'i' } } ] };
    } else {
      // No supplier record — return zero stats but include system-wide info
      myOfferQuery = { supplier_id: '___none___' };
    }
    const myOffers = await db.collection('offers').find(myOfferQuery, { projection: { _id: 0 } }).toArray();
    const won = myOffers.filter(o => o.status === 'accepted');
    const winRate = myOffers.length ? Math.round(won.length / myOffers.length * 100) : 0;
    // Avg price gap: for closed requests we didn't win, how far were we from the accepted price
    const closedReqs = await db.collection('requests').find({ status: 'closed', accepted_offer_id: { $ne: null } }).toArray();
    let gapSum = 0, gapCount = 0;
    for (const cr of closedReqs) {
      const winner = await db.collection('offers').findOne({ id: cr.accepted_offer_id });
      if (!winner) continue;
      const myOnThis = myOffers.find(o => o.request_id === cr.id);
      if (myOnThis && myOnThis.id !== winner.id) {
        gapSum += (myOnThis.price_inr - winner.price_inr) / winner.price_inr;
        gapCount++;
      }
    }
    const avgPriceGap = gapCount ? Math.round((gapSum / gapCount) * 10000) / 100 : 0;
    // Hot cities from all requests
    const allReqs = await db.collection('requests').find({}).limit(200).toArray();
    const cityCount = {};
    for (const r of allReqs) {
      const c = r.requirement?.location;
      if (c) cityCount[c] = (cityCount[c] || 0) + 1;
    }
    const hotCities = Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count }));
    // Category demand
    const subCatCount = {};
    for (const r of allReqs) {
      const s = r.requirement?.sub_category;
      if (s) subCatCount[s] = (subCatCount[s] || 0) + 1;
    }
    const hotCategories = Object.entries(subCatCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sub_category, count]) => ({ sub_category, count }));
    // Recent activity
    const recent = myOffers.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);
    return ok({
      supplier: supplier || null,
      stats: {
        total_requests_available: totalReq,
        open_requests: openReq,
        offers_submitted: myOffers.length,
        offers_won: won.length,
        win_rate_pct: winRate,
        avg_price_gap_pct: avgPriceGap,
      },
      hot_cities: hotCities,
      hot_categories: hotCategories,
      recent_offers: recent,
    });
  }

  // --- Supplier Auto-Bid Rules ---
  if (path === '/supplier/rules' && method === 'POST') {
    const b = await req.json();
    if (!b.supplier_email) return err('supplier_email required');
    const supplier = await db.collection('suppliers').findOne({ email: b.supplier_email });
    if (!supplier) return err('supplier not found', 404);
    const rule = {
      id: uuidv4(),
      supplier_id: supplier.id,
      supplier_email: b.supplier_email,
      name: b.name || 'My auto-bid rule',
      brand: b.brand || null,
      sub_category: b.sub_category || 'any',
      city: b.city || null,
      min_price: b.min_price ? Number(b.min_price) : null,
      discount_pct: Number(b.discount_pct) || 5,
      delivery_days: Number(b.delivery_days) || 2,
      warranty: b.warranty || '1 year manufacturer',
      extras: b.extras || '',
      validity_hours: Number(b.validity_hours) || 24,
      message: b.message || '',
      enabled: b.enabled !== false,
      created_at: new Date().toISOString(),
    };
    await db.collection('supplier_rules').insertOne(rule);
    return ok({ rule });
  }
  const rulesMatch = path.match(/^\/supplier\/rules\/(.+)$/);
  if (rulesMatch && method === 'GET') {
    const email = decodeURIComponent(rulesMatch[1]);
    const list = await db.collection('supplier_rules').find({ supplier_email: email }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    return ok({ rules: list });
  }
  const ruleDelMatch = path.match(/^\/supplier\/rules\/id\/([^/]+)$/);
  if (ruleDelMatch && method === 'DELETE') {
    await db.collection('supplier_rules').deleteOne({ id: ruleDelMatch[1] });
    return ok({ ok: true });
  }
  const ruleToggleMatch = path.match(/^\/supplier\/rules\/id\/([^/]+)\/toggle$/);
  if (ruleToggleMatch && method === 'POST') {
    const id = ruleToggleMatch[1];
    const r = await db.collection('supplier_rules').findOne({ id });
    if (!r) return err('not found', 404);
    await db.collection('supplier_rules').updateOne({ id }, { $set: { enabled: !r.enabled } });
    return ok({ ok: true, enabled: !r.enabled });
  }

  // --- Buyer Wallet ---
  const walletMatch = path.match(/^\/wallet\/(.+)$/);
  if (walletMatch && method === 'GET') {
    const email = decodeURIComponent(walletMatch[1]);
    let w = await db.collection('wallets').findOne({ email }, { projection: { _id: 0 } });
    if (!w) {
      w = { email, balance_inr: 0, transactions: [], created_at: new Date().toISOString() };
      await db.collection('wallets').insertOne({ ...w });
    }
    return ok({ wallet: w });
  }
  if (path === '/wallet/apply' && method === 'POST') {
    const { email, amount_inr } = await req.json();
    if (!email) return err('email required');
    const w = await db.collection('wallets').findOne({ email });
    if (!w) return err('wallet not found', 404);
    const applied = Math.max(0, Math.min(w.balance_inr, Number(amount_inr) || 0));
    return ok({ applicable: applied, balance: w.balance_inr });
  }

  // --- Group buying ---
  if (path === '/groups' && method === 'POST') {
    const b = await req.json();
    if (!b.request_id) return err('request_id required');
    const reqDoc = await db.collection('requests').findOne({ id: b.request_id });
    if (!reqDoc) return err('request not found', 404);
    const group = {
      id: uuidv4(),
      seed_request_id: b.request_id,
      product_key: `${reqDoc.requirement.brand || ''}_${reqDoc.requirement.model || reqDoc.requirement.product || ''}_${reqDoc.requirement.storage || ''}`.toLowerCase().replace(/\s+/g, '_'),
      requirement: reqDoc.requirement,
      members: [{ email: b.buyer_email || reqDoc.buyer_email, name: b.buyer_name || reqDoc.buyer_name, joined_at: new Date().toISOString() }],
      target_size: 5,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    await db.collection('groups').insertOne(group);
    return ok({ group });
  }
  if (path === '/groups' && method === 'GET') {
    const url = new URL(req.url);
    const productKey = url.searchParams.get('product_key');
    const q = { status: 'open' };
    if (productKey) q.product_key = productKey;
    const list = await db.collection('groups').find(q, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(20).toArray();
    return ok({ groups: list });
  }
  const groupJoinMatch = path.match(/^\/groups\/([^/]+)\/join$/);
  if (groupJoinMatch && method === 'POST') {
    const id = groupJoinMatch[1];
    const b = await req.json();
    if (!b.buyer_email) return err('buyer_email required');
    const g = await db.collection('groups').findOne({ id });
    if (!g) return err('group not found', 404);
    if (g.members.some(m => m.email === b.buyer_email)) return err('already joined');
    const member = { email: b.buyer_email, name: b.buyer_name || 'Buyer', joined_at: new Date().toISOString() };
    await db.collection('groups').updateOne({ id }, { $push: { members: member } });
    const upd = await db.collection('groups').findOne({ id }, { projection: { _id: 0 } });
    return ok({ group: upd });
  }
  const groupSuggestMatch = path.match(/^\/requests\/([^/]+)\/group-suggestion$/);
  if (groupSuggestMatch && method === 'GET') {
    const id = groupSuggestMatch[1];
    const r = await db.collection('requests').findOne({ id });
    if (!r) return err('not found', 404);
    const productKey = `${r.requirement.brand || ''}_${r.requirement.model || r.requirement.product || ''}_${r.requirement.storage || ''}`.toLowerCase().replace(/\s+/g, '_');
    const existingGroup = await db.collection('groups').findOne({ product_key: productKey, status: 'open' });
    // Similar recent requests (last 7 days) with same brand/product
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const similar = await db.collection('requests').find({
      id: { $ne: id },
      'requirement.brand': r.requirement.brand,
      'requirement.sub_category': r.requirement.sub_category,
      created_at: { $gte: weekAgo },
    }, { projection: { _id: 0 } }).limit(10).toArray();
    return ok({ existing_group: existingGroup, similar_count: similar.length, similar_requests: similar.slice(0, 5), product_key: productKey });
  }

  // --- Delivery tracking ---
  const deliveryMatch = path.match(/^\/delivery\/([^/]+)$/);
  if (deliveryMatch && method === 'GET') {
    const status = await deliveryStatus(db, deliveryMatch[1]);
    if (!status) return err('offer not found', 404);
    return ok({ delivery: status });
  }

  return err('route not found: ' + method + ' ' + path, 404);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
