export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/mongo';
import { llm, MODEL_EXTRACT, MODEL_SIMULATE } from '@/lib/llm';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function ok(data, status = 200) {
  return NextResponse.json(data, { status, headers: cors });
}
function err(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: cors });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// -----------------------------
// AI: Extract structured requirement from natural language
// -----------------------------
async function extractRequirement(text) {
  const system = `You are BoliBazaar's AI buying assistant for the Indian electronics market. Extract a structured buying requirement from the user's message. Return STRICT JSON only, no prose.

Schema:
{
  "category": "electronics",
  "sub_category": string (one of: smartphone, laptop, tablet, tv, gaming_console, smartwatch, headphones, camera, accessory, other),
  "product": string,
  "brand": string | null,
  "model": string | null,
  "storage": string | null,
  "ram": string | null,
  "colour": string | null,
  "size": string | null,
  "budget_inr": number | null,
  "location": string | null,
  "delivery_preference": string | null,
  "quantity": number,
  "additional_notes": string | null,
  "summary": string (short human friendly summary),
  "confidence": number 0..1
}

Rules:
- All prices are in INR. Convert lakh/crore/k appropriately (1 lakh = 100000, 1 crore = 10000000, 1k = 1000).
- quantity defaults to 1 when unspecified.
- If category is not electronics, still set sub_category best guess and note in additional_notes.
- summary must be one crisp sentence like: "iPhone 17 Pro Max 256GB Black under ₹1,20,000, deliver to Mumbai".`;

  const resp = await llm.chat.completions.create({
    model: MODEL_EXTRACT,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const raw = resp.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  if (!parsed.quantity || parsed.quantity < 1) parsed.quantity = 1;
  parsed.category = 'electronics';
  return parsed;
}

// -----------------------------
// Simulate competing supplier offers (fast, deterministic, realistic)
// -----------------------------
const SUPPLIER_POOL = [
  { name: 'Croma - Andheri West',       type: 'retail_store',        rating: 4.6, reviews: 3240, city: 'Mumbai',    dist: 2.4 },
  { name: 'Reliance Digital - BKC',     type: 'retail_store',        rating: 4.5, reviews: 4890, city: 'Mumbai',    dist: 5.1 },
  { name: 'Vijay Sales - Dadar',        type: 'retail_store',        rating: 4.4, reviews: 2110, city: 'Mumbai',    dist: 7.8 },
  { name: 'Poorvika Mobiles',           type: 'authorised_reseller', rating: 4.7, reviews: 5200, city: 'Bengaluru', dist: 3.2 },
  { name: 'Sangeetha Mobiles',          type: 'authorised_reseller', rating: 4.5, reviews: 3980, city: 'Bengaluru', dist: 6.4 },
  { name: 'iPlanet Bengaluru',          type: 'brand_store',         rating: 4.8, reviews: 1290, city: 'Bengaluru', dist: 4.5 },
  { name: 'Unicorn Store - Delhi',      type: 'brand_store',         rating: 4.8, reviews: 1780, city: 'Delhi',     dist: 8.9 },
  { name: 'Bajaj Electronics',          type: 'retail_store',        rating: 4.4, reviews: 2560, city: 'Hyderabad', dist: 4.1 },
  { name: 'Girias Chennai',             type: 'retail_store',        rating: 4.5, reviews: 1890, city: 'Chennai',   dist: 5.7 },
  { name: 'Ezone Electronics',          type: 'retail_store',        rating: 4.3, reviews: 1450, city: 'Pune',      dist: 3.9 },
  { name: 'PriceMart Wholesale',        type: 'wholesaler',          rating: 4.2, reviews: 640,  city: null,        dist: null },
  { name: 'B2B ElectroHub',             type: 'wholesaler',          rating: 4.3, reviews: 780,  city: null,        dist: null },
];

const EXTRAS_POOL = [
  'Free tempered glass + case',
  'Instant HDFC 10% off (max ₹5,000)',
  'Free AirPods 4 with purchase',
  'No-cost EMI up to 12 months',
  'Free 1-year AppleCare+ upgrade',
  'Free shipping + free installation',
  '₹3,000 exchange bonus on any old device',
  'Complimentary 20W adapter + cable',
  'ICICI 7.5% cashback on debit cards',
  'Extended warranty (1 year) free',
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function pickN(arr, n) {
  const a = [...arr];
  const out = [];
  for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

function simulateOffers(requirement) {
  // Base price: use budget as ceiling, else derive from sub_category
  const defaults = {
    smartphone: 80000, laptop: 90000, tablet: 45000, tv: 60000,
    gaming_console: 55000, smartwatch: 30000, headphones: 20000,
    camera: 70000, accessory: 5000, other: 25000,
  };
  const base = requirement.budget_inr && requirement.budget_inr > 500
    ? requirement.budget_inr
    : (defaults[requirement.sub_category] || 40000);

  // Pick 5 diverse suppliers, prioritise ones in the buyer's location
  const loc = (requirement.location || '').toLowerCase();
  const pool = [...SUPPLIER_POOL].sort((a, b) => {
    const aMatch = a.city && loc.includes(a.city.toLowerCase()) ? 1 : 0;
    const bMatch = b.city && loc.includes(b.city.toLowerCase()) ? 1 : 0;
    return bMatch - aMatch;
  });
  const suppliers = pool.slice(0, 3).concat(pickN(pool.slice(3), 2));

  // Price variations: 88% - 102% of budget/base
  const variations = [0.88, 0.93, 0.96, 0.99, 1.02];
  // Shuffle so "best value" isn't always first
  variations.sort(() => Math.random() - 0.5);

  return suppliers.map((s, i) => {
    const price = Math.round((base * variations[i]) / 100) * 100;
    const delivery_days = i === 0 ? 0 : Math.max(1, Math.round(rand(1, 5)));
    const delivery_note = delivery_days === 0
      ? `Same-day delivery in ${s.city || 'metro cities'}`
      : delivery_days <= 2 ? `Next-day delivery` : `${delivery_days}-day pan-India shipping`;
    const warranty = s.type === 'brand_store'
      ? '1 year manufacturer + 6 months BoliBazaar extended'
      : s.type === 'authorised_reseller'
        ? '1 year manufacturer + on-site pickup'
        : '1 year manufacturer';
    return {
      supplier_name: s.name,
      supplier_type: s.type,
      price_inr: price,
      delivery_days,
      delivery_note,
      warranty,
      rating: s.rating,
      reviews: s.reviews,
      distance_km: s.dist,
      validity_hours: [6, 12, 24, 48][Math.floor(Math.random() * 4)],
      extras: pickN(EXTRAS_POOL, 1)[0],
      message: [
        `In stock and ready to dispatch. Best price in ${s.city || 'India'} guaranteed.`,
        `${s.type === 'brand_store' ? 'Direct from brand' : 'Authorised stock'} with GST invoice. Happy to negotiate!`,
        `Been serving customers for 15+ years. Free demo available at store.`,
        `Bulk buyer? We can do better. Chat with us.`,
      ][Math.floor(Math.random() * 4)],
    };
  });
}

// -----------------------------
// Router
// -----------------------------
async function route(req, { params }) {
  const p = await params;
  const segs = p?.path || [];
  const path = '/' + segs.join('/');
  const method = req.method;
  const db = await getDb();

  // Health
  if (path === '/' || path === '/health') {
    return ok({ status: 'ok', service: 'BoliBazaar API' });
  }

  // Extract structured requirement
  if (path === '/extract' && method === 'POST') {
    const { text } = await req.json();
    if (!text || !text.trim()) return err('text is required');
    try {
      const requirement = await extractRequirement(text);
      return ok({ requirement });
    } catch (e) {
      console.error('extract error', e);
      return err('AI extraction failed: ' + (e.message || 'unknown'), 500);
    }
  }

  // Create a request (buyer confirmed requirement)
  if (path === '/requests' && method === 'POST') {
    const body = await req.json();
    const requirement = body.requirement;
    const rawText = body.raw_text || '';
    const buyerName = body.buyer_name || 'Guest Buyer';
    if (!requirement) return err('requirement is required');
    const id = uuidv4();
    const doc = {
      id,
      buyer_name: buyerName,
      raw_text: rawText,
      requirement,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    await db.collection('requests').insertOne(doc);
    return ok({ request: doc });
  }

  // List all requests
  if (path === '/requests' && method === 'GET') {
    const list = await db.collection('requests').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray();
    return ok({ requests: list });
  }

  // Get a single request
  const reqMatch = path.match(/^\/requests\/([^/]+)$/);
  if (reqMatch && method === 'GET') {
    const id = reqMatch[1];
    const doc = await db.collection('requests').findOne({ id }, { projection: { _id: 0 } });
    if (!doc) return err('not found', 404);
    const offers = await db.collection('offers').find({ request_id: id }, { projection: { _id: 0 } }).sort({ price_inr: 1 }).toArray();
    return ok({ request: doc, offers });
  }

  // Simulate AI-driven supplier offers
  const simMatch = path.match(/^\/requests\/([^/]+)\/simulate$/);
  if (simMatch && method === 'POST') {
    const id = simMatch[1];
    const reqDoc = await db.collection('requests').findOne({ id });
    if (!reqDoc) return err('request not found', 404);
    try {
      const offers = simulateOffers(reqDoc.requirement);
      const withIds = offers.map(o => ({
        id: uuidv4(),
        request_id: id,
        ...o,
        status: 'pending',
        source: 'ai_simulated',
        created_at: new Date().toISOString(),
      }));
      if (withIds.length) await db.collection('offers').insertMany(withIds);
      return ok({ offers: withIds });
    } catch (e) {
      console.error('simulate error', e);
      return err('offer simulation failed: ' + (e.message || 'unknown'), 500);
    }
  }

  // Submit a manual offer (supplier)
  const offerMatch = path.match(/^\/requests\/([^/]+)\/offers$/);
  if (offerMatch && method === 'POST') {
    const id = offerMatch[1];
    const body = await req.json();
    const reqDoc = await db.collection('requests').findOne({ id });
    if (!reqDoc) return err('request not found', 404);
    const offer = {
      id: uuidv4(),
      request_id: id,
      supplier_name: body.supplier_name || 'Unknown Supplier',
      supplier_type: body.supplier_type || 'retail_store',
      price_inr: Number(body.price_inr) || 0,
      delivery_days: Number(body.delivery_days) || 3,
      delivery_note: body.delivery_note || 'Standard delivery',
      warranty: body.warranty || '1 year manufacturer',
      rating: Number(body.rating) || 4.5,
      reviews: Number(body.reviews) || 100,
      distance_km: body.distance_km ? Number(body.distance_km) : null,
      validity_hours: Number(body.validity_hours) || 24,
      extras: body.extras || '',
      message: body.message || '',
      status: 'pending',
      source: 'supplier_manual',
      created_at: new Date().toISOString(),
    };
    await db.collection('offers').insertOne(offer);
    return ok({ offer });
  }

  // Accept an offer
  const acceptMatch = path.match(/^\/offers\/([^/]+)\/accept$/);
  if (acceptMatch && method === 'POST') {
    const offerId = acceptMatch[1];
    const offer = await db.collection('offers').findOne({ id: offerId });
    if (!offer) return err('offer not found', 404);
    await db.collection('offers').updateOne({ id: offerId }, { $set: { status: 'accepted' } });
    await db.collection('offers').updateMany(
      { request_id: offer.request_id, id: { $ne: offerId } },
      { $set: { status: 'rejected' } }
    );
    await db.collection('requests').updateOne(
      { id: offer.request_id },
      { $set: { status: 'closed', accepted_offer_id: offerId } }
    );
    return ok({ ok: true, accepted_offer_id: offerId });
  }

  return err('route not found: ' + method + ' ' + path, 404);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;
