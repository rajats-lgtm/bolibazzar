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

Schema:
{
  "category": "electronics",
  "sub_category": string (smartphone|laptop|tablet|tv|gaming_console|smartwatch|headphones|camera|accessory|other),
  "product": string,
  "brand": string|null, "model": string|null, "storage": string|null, "ram": string|null,
  "colour": string|null, "size": string|null,
  "budget_inr": number|null,
  "location": string|null, "delivery_preference": string|null,
  "quantity": number,
  "additional_notes": string|null,
  "summary": string (one crisp sentence),
  "confidence": number 0..1
}
Rules: All prices in INR. Convert lakh(=100000), crore(=10000000), k(=1000). quantity defaults 1.`;
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
  const body = `\u{1F514} New buyer request on BoliBazaar!\n\n${summary}\n\nBudget: ${request.requirement.budget_inr ? '\u20B9' + request.requirement.budget_inr.toLocaleString('en-IN') : 'flexible'}\nLocation: ${request.requirement.location || 'India'}\nQty: ${request.requirement.quantity}\n\nOpen dashboard: ${link}`;
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

// --- deterministic offer simulation ---
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
    return ok({ user, requests });
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
    // Fire-and-forget WhatsApp alerts to matching approved suppliers
    notifyMatchingSuppliers(db, doc).catch(e => console.error('whatsapp notify', e));
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
    const { offer_id, amount_inr } = await req.json();
    if (!offer_id || !amount_inr) return err('offer_id and amount_inr required');
    const receipt = 'BB_' + offer_id.slice(0, 8) + '_' + Date.now();
    const amountPaise = Math.round(Number(amount_inr) * 100);
    try {
      const order = await createRazorpayOrder(amountPaise, receipt);
      const payment = {
        id: uuidv4(),
        offer_id, receipt,
        amount_inr: Number(amount_inr), amount_paise: amountPaise,
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

  return err('route not found: ' + method + ' ' + path, 404);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
