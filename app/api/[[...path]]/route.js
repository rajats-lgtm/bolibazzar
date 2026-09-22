export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '@/lib/mongo';
import { getLlm, hasLlm, MODEL_EXTRACT } from '@/lib/llm';
import {
  ROLES, sessionSubject, attachSession, clearSession, safeEqual, createSessionToken,
  generateOtp, hashOtp, otpDevMode, OTP_TTL_MS, OTP_MAX_ATTEMPTS,
  normaliseEmail, isEmail, normalisePhone, isProductionEnv, appEnv,
} from '@/lib/auth';
import { computeValueScore, computeTier } from '@/lib/scoring';
import { advanceAuction, runAutoBidMatching, AUCTION_WINDOW_MS, demoBiddersEnabled } from '@/lib/bidding';
import { createOrder, trackOrder, setOrderStage, findOrderByOffer, STAGE_KEYS } from '@/lib/orders';
import {
  hasWhatsApp, sendOtp, addNotification, listNotifications, markNotificationsRead,
  notifySuppliersOfRequest, notifyBuyerOfOffer, notifySupplierOfWin, notifyChatMessage,
} from '@/lib/notify';

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

function corsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '';
  // Credentialed requests cannot use "*", so echo back only allowlisted origins.
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '';
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
  if (allow) headers['Access-Control-Allow-Origin'] = allow;
  return headers;
}

let currentReq = null;
function ok(data, status = 200) { return NextResponse.json(data, { status, headers: corsHeaders(currentReq) }); }
function err(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: corsHeaders(currentReq) });
}
export async function OPTIONS(req) { return new NextResponse(null, { status: 204, headers: corsHeaders(req) }); }

async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}

function safeRegex(value) { return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
function sessionAdmin(req) {
  const email = sessionSubject(req, ROLES.ADMIN);
  return email && adminEmails().includes(email) ? email : null;
}
async function auditAdmin(db, action, email, details = {}) {
  await db.collection('admin_audit').insertOne({
    id: uuidv4(), action, actor_email: email || null, details, created_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// AI requirement extraction
// ---------------------------------------------------------------------------

const EXTRACT_SYSTEM = `You are BoliBazaar's AI buying assistant for the Indian electronics market. Extract a structured buying requirement from the user's message. Return STRICT JSON only.

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

async function extractRequirement(text) {
  const response = await getLlm().chat.completions.create({
    model: MODEL_EXTRACT,
    messages: [{ role: 'system', content: EXTRACT_SYSTEM }, { role: 'user', content: text }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
  if (!parsed.quantity || parsed.quantity < 1) parsed.quantity = 1;
  parsed.category = 'electronics';
  return parsed;
}

/**
 * Fallback parser used when the LLM is unreachable or unconfigured, so the
 * product still works offline. Handles the common English/Hinglish shapes.
 */
function extractRequirementLocally(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();

  let budget = null;
  const lakh = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac)/);
  const thousand = lower.match(/(\d+(?:\.\d+)?)\s*(?:k\b|hazaar|hazar|thousand)/);
  const plain = lower.replace(/[, ]/g, '').match(/(?:under|below|budget|upto|up to|₹|rs\.?)(\d{4,8})/);
  if (lakh) budget = Math.round(parseFloat(lakh[1]) * 100000);
  else if (thousand) budget = Math.round(parseFloat(thousand[1]) * 1000);
  else if (plain) budget = Number(plain[1]);

  const brands = ['Apple', 'Samsung', 'Sony', 'LG', 'OnePlus', 'Xiaomi', 'Realme', 'Vivo', 'Oppo', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Nothing', 'Google'];
  const brand = brands.find((b) => lower.includes(b.toLowerCase())) || null;

  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Kochi', 'Goa', 'Coimbatore', 'Noida', 'Gurugram'];
  const location = cities.find((c) => lower.includes(c.toLowerCase())) || null;

  const subCategories = [
    ['smartphone', ['iphone', 'phone', 'galaxy', 'pixel', 'mobile']],
    ['laptop', ['laptop', 'macbook', 'notebook', 'thinkpad']],
    ['tablet', ['ipad', 'tablet', 'tab ']],
    ['tv', ['tv', 'television', 'oled', 'qled']],
    ['gaming_console', ['playstation', 'ps5', 'ps6', 'xbox', 'console', 'nintendo']],
    ['smartwatch', ['watch', 'smartwatch']],
    ['headphones', ['headphone', 'earbud', 'airpod', 'earphone']],
    ['camera', ['camera', 'dslr', 'mirrorless']],
  ];
  const subCategory = subCategories.find(([, keys]) => keys.some((k) => lower.includes(k)))?.[0] || 'other';

  const storage = raw.match(/(\d+)\s?(tb|gb)\b/i)?.[0] || null;
  const quantity = Number(lower.match(/(?:qty|quantity|)\s*(\d+)\s*(?:pcs|pieces|units)/)?.[1]) || 1;

  return {
    category: 'electronics',
    sub_category: subCategory,
    product: raw.slice(0, 90).trim(),
    brand, model: null, storage, ram: null, colour: null, size: null,
    budget_inr: budget,
    location,
    delivery_preference: /same.?day/.test(lower) ? 'same-day' : null,
    quantity,
    additional_notes: null,
    summary: raw.trim().slice(0, 140),
    detected_language: /[ऀ-ॿ]/.test(raw) ? 'hi' : 'en',
    confidence: 0.45,
    parsed_locally: true,
  };
}

// ---------------------------------------------------------------------------
// Razorpay
// ---------------------------------------------------------------------------

function hasRazorpay() { return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET); }

/**
 * Lets a payment settle without a real gateway signature, so the flow can be
 * driven from tests, from a UAT, and from the mobile apps before checkout is
 * wired up. Hard-disabled in a production environment: this must never be
 * reachable on a live site, regardless of how the build was compiled.
 */
function paymentsTestMode() {
  return !isProductionEnv() && process.env.PAYMENTS_TEST_MODE === 'true';
}

async function createRazorpayOrder(amountPaise, receipt) {
  if (!hasRazorpay()) {
    return { orderId: 'mock_order_' + uuidv4().slice(0, 12), amount: amountPaise, currency: 'INR', mocked: true };
  }
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || 'Razorpay order creation failed');
  return { orderId: data.id, amount: data.amount, currency: data.currency, mocked: false };
}

function verifyRazorpaySignature({ order_id, payment_id, signature }) {
  // A live order must always carry a valid signature — never auto-pass.
  if (!hasRazorpay()) return false;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');
  return safeEqual(expected, signature || '');
}

// ---------------------------------------------------------------------------
// Access control helpers
// ---------------------------------------------------------------------------

function buyerEmail(req) { return sessionSubject(req, ROLES.BUYER); }
function supplierEmail(req) { return sessionSubject(req, ROLES.SUPPLIER); }

async function currentSupplier(db, req) {
  const email = supplierEmail(req);
  if (!email) return null;
  return db.collection('suppliers').findOne({ email }, { projection: { _id: 0 } });
}

/** A request is readable by its owner, by any supplier, or by anyone when it has no owner. */
function canReadRequest(request, { buyer, supplier }) {
  if (!request.buyer_email) return true;
  if (buyer && request.buyer_email === buyer) return true;
  if (supplier) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function route(req, { params }) {
  currentReq = req;
  const resolved = await params;
  const path = '/' + (resolved?.path || []).join('/');
  const method = req.method;
  const url = new URL(req.url);

  if (path === '/' || path === '/health') {
    return ok({
      status: 'ok',
      service: 'BoliBazzar API',
      environment: appEnv(),
      razorpay_live: hasRazorpay(),
      payments_test_mode: paymentsTestMode(),
      whatsapp_live: hasWhatsApp(),
      demo_bidders: demoBiddersEnabled(),
      auction_window_seconds: Math.round(AUCTION_WINDOW_MS / 1000),
    });
  }

  // ---- Admin session (before the DB so a bad key never touches Mongo) -----
  if (path === '/admin/session' && method === 'POST') {
    const { email, access_key } = await readJson(req);
    const normalised = normaliseEmail(email);
    const configured = !!process.env.ADMIN_ACCESS_KEY;
    const valid = configured && adminEmails().includes(normalised) && safeEqual(access_key || '', process.env.ADMIN_ACCESS_KEY);
    if (!valid) {
      try { await auditAdmin(await getDb(), 'login_failed', normalised || null); } catch {}
      return err('admin access denied', 403);
    }
    try { await auditAdmin(await getDb(), 'login_success', normalised); } catch {}
    return attachSession(ok({ ok: true, email: normalised }), ROLES.ADMIN, normalised);
  }
  if (path === '/admin/session' && method === 'GET') {
    const email = sessionAdmin(req);
    return ok({ authenticated: !!email, email });
  }
  if (path === '/admin/session' && method === 'DELETE') {
    const email = sessionAdmin(req);
    if (email) { try { await auditAdmin(await getDb(), 'logout', email); } catch {} }
    return clearSession(ok({ ok: true }), ROLES.ADMIN);
  }
  if (path.startsWith('/admin/') && path !== '/admin/session' && !sessionAdmin(req)) {
    return err('admin authentication required', 401);
  }

  const db = await getDb();
  const buyer = buyerEmail(req);
  const supplierSession = supplierEmail(req);

  // =========================================================================
  // AUTH — one-time passcode
  // =========================================================================

  if (path === '/auth/otp/request' && method === 'POST') {
    const body = await readJson(req);
    const role = body.role === ROLES.SUPPLIER ? ROLES.SUPPLIER : ROLES.BUYER;
    const email = normaliseEmail(body.email);
    const phone = normalisePhone(body.phone);
    if (!isEmail(email) && !phone) return err('a valid email or Indian mobile number is required');

    const destination = phone || email;
    const channel = phone ? 'phone' : 'email';

    // Throttle: at most 5 codes per destination per 15 minutes.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recent = await db.collection('otps').countDocuments({ destination, created_at: { $gte: since } });
    if (recent >= 5) return err('too many codes requested, please wait a few minutes', 429);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await db.collection('otps').insertOne({
      id: uuidv4(),
      destination, channel, role,
      email: isEmail(email) ? email : null,
      code_hash: hashOtp(destination, code),
      attempts: 0,
      consumed: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    const delivery = await sendOtp(db, { destination, channel, code });
    return ok({
      ok: true,
      destination,
      channel,
      expires_in_seconds: Math.round(OTP_TTL_MS / 1000),
      delivery,
      // Local dev only — lets you sign in without an SMS/email provider.
      ...(otpDevMode() ? { dev_code: code } : {}),
    });
  }

  if (path === '/auth/otp/verify' && method === 'POST') {
    const body = await readJson(req);
    const role = body.role === ROLES.SUPPLIER ? ROLES.SUPPLIER : ROLES.BUYER;
    const email = normaliseEmail(body.email);
    const phone = normalisePhone(body.phone);
    const destination = phone || email;
    const code = String(body.code || '').trim();
    if (!destination || !code) return err('destination and code are required');

    const record = await db.collection('otps').findOne(
      { destination, consumed: false, expires_at: { $gt: new Date() } },
      { sort: { created_at: -1 } }
    );
    if (!record) return err('that code has expired, please request a new one', 400);
    if (record.attempts >= OTP_MAX_ATTEMPTS) return err('too many incorrect attempts, request a new code', 429);

    if (!safeEqual(record.code_hash, hashOtp(destination, code))) {
      await db.collection('otps').updateOne({ id: record.id }, { $inc: { attempts: 1 } });
      return err('incorrect code', 401);
    }
    await db.collection('otps').updateOne({ id: record.id }, { $set: { consumed: true, consumed_at: new Date().toISOString() } });

    const now = new Date().toISOString();

    if (role === ROLES.SUPPLIER) {
      const accountEmail = record.email || email;
      if (!isEmail(accountEmail)) return err('an email address is required for supplier accounts');
      let supplier = await db.collection('suppliers').findOne({ email: accountEmail }, { projection: { _id: 0 } });
      if (!supplier) {
        supplier = {
          id: uuidv4(),
          business_name: body.business_name?.trim() || accountEmail.split('@')[0],
          email: accountEmail,
          phone: phone || null,
          city: body.city || '', address: '', pincode: '',
          gst: '', gst_valid: false,
          categories: ['electronics'], brand_authorisations: [],
          supplier_type: body.supplier_type || 'retail_store',
          status: 'pending_review',
          is_demo: false,
          rating: 4.5, reviews: 0,
          created_at: now,
        };
        await db.collection('suppliers').insertOne(supplier);
      } else {
        await db.collection('suppliers').updateOne({ email: accountEmail }, { $set: { last_login: now } });
      }
      if (supplier.status === 'suspended') return err('this supplier account is suspended', 403);
      // `token` is for native apps, which send it back as a Bearer header.
      // Web clients ignore it and use the httpOnly cookie instead.
      const token = createSessionToken(ROLES.SUPPLIER, accountEmail);
      return attachSession(ok({ ok: true, role, supplier, token }), ROLES.SUPPLIER, accountEmail);
    }

    const accountEmail = record.email || email;
    if (!isEmail(accountEmail)) return err('an email address is required');
    let user = await db.collection('users').findOne({ email: accountEmail }, { projection: { _id: 0 } });
    if (!user) {
      user = {
        id: uuidv4(),
        name: body.name?.trim() || accountEmail.split('@')[0],
        email: accountEmail,
        phone: phone || null,
        picture: null,
        role: 'buyer',
        status: 'active',
        total_spent_inr: 0,
        created_at: now,
        last_login: now,
      };
      await db.collection('users').insertOne(user);
    } else {
      const update = { last_login: now };
      if (body.name?.trim()) update.name = body.name.trim();
      if (phone) update.phone = phone;
      await db.collection('users').updateOne({ email: accountEmail }, { $set: update });
      user = { ...user, ...update };
    }
    if (user.status === 'suspended') return err('this account is suspended', 403);

    // Adopt any guest requests made from this browser before signing in.
    if (Array.isArray(body.claim_request_ids) && body.claim_request_ids.length) {
      await db.collection('requests').updateMany(
        { id: { $in: body.claim_request_ids.slice(0, 20) }, buyer_email: null },
        { $set: { buyer_email: accountEmail, buyer_name: user.name } }
      );
    }

    return attachSession(
      ok({
        ok: true, role,
        user: { ...user, tier: computeTier(user.total_spent_inr || 0) },
        token: createSessionToken(ROLES.BUYER, accountEmail),
      }),
      ROLES.BUYER,
      accountEmail
    );
  }

  if (path === '/auth/session' && method === 'GET') {
    const [user, supplier] = await Promise.all([
      buyer ? db.collection('users').findOne({ email: buyer }, { projection: { _id: 0 } }) : null,
      supplierSession ? db.collection('suppliers').findOne({ email: supplierSession }, { projection: { _id: 0 } }) : null,
    ]);
    return ok({
      buyer: user ? { ...user, tier: computeTier(user.total_spent_inr || 0) } : null,
      supplier: supplier || null,
      admin: sessionAdmin(req),
    });
  }

  if (path === '/auth/session' && method === 'DELETE') {
    const body = await readJson(req);
    const response = ok({ ok: true });
    if (!body.role || body.role === ROLES.BUYER) clearSession(response, ROLES.BUYER);
    if (!body.role || body.role === ROLES.SUPPLIER) clearSession(response, ROLES.SUPPLIER);
    return response;
  }

  // =========================================================================
  // BUYER PROFILE, WALLET, NOTIFICATIONS
  // =========================================================================

  if (path === '/me' && method === 'GET') {
    if (!buyer) return err('sign in required', 401);
    const user = await db.collection('users').findOne({ email: buyer }, { projection: { _id: 0 } });
    if (!user) return err('account not found', 404);
    const [requests, orders] = await Promise.all([
      db.collection('requests').find({ buyer_email: buyer }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray(),
      db.collection('orders').find({ buyer_email: buyer }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray(),
    ]);
    return ok({ user: { ...user, tier: computeTier(user.total_spent_inr || 0) }, requests, orders });
  }

  if (path === '/wallet' && method === 'GET') {
    if (!buyer) return err('sign in required', 401);
    let wallet = await db.collection('wallets').findOne({ email: buyer }, { projection: { _id: 0 } });
    if (!wallet) {
      wallet = { email: buyer, balance_inr: 0, transactions: [], created_at: new Date().toISOString() };
      await db.collection('wallets').insertOne({ ...wallet });
    }
    return ok({ wallet });
  }

  if (path === '/notifications' && method === 'GET') {
    const recipient = buyer || supplierSession;
    if (!recipient) return err('sign in required', 401);
    const { items, unread } = await listNotifications(db, recipient);
    return ok({ notifications: items, unread });
  }
  if (path === '/notifications/read' && method === 'POST') {
    const recipient = buyer || supplierSession;
    if (!recipient) return err('sign in required', 401);
    const { ids } = await readJson(req);
    const updated = await markNotificationsRead(db, recipient, ids);
    return ok({ ok: true, updated });
  }

  // =========================================================================
  // SUPPLIERS
  // =========================================================================

  if (path === '/suppliers' && method === 'POST') {
    const body = await readJson(req);
    const email = normaliseEmail(body.email);
    if (!body.business_name || !body.gst || !isEmail(email)) {
      return err('business_name, gst and a valid email are required');
    }
    const gst = String(body.gst).toUpperCase();
    const gstValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
    const existing = await db.collection('suppliers').findOne({ email });

    const fields = {
      business_name: body.business_name,
      gst, gst_valid: gstValid,
      phone: normalisePhone(body.phone),
      address: body.address || '', city: body.city || '', pincode: body.pincode || '',
      categories: body.categories || ['electronics'],
      brand_authorisations: body.brand_authorisations || [],
      supplier_type: body.supplier_type || 'retail_store',
      // A valid GSTIN format is a sanity check, not a verification. Real
      // approval is an admin decision.
      status: existing?.status || 'pending_review',
      gst_format_ok: gstValid,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await db.collection('suppliers').updateOne({ email }, { $set: fields });
    } else {
      await db.collection('suppliers').insertOne({
        id: uuidv4(), email, is_demo: false, rating: 4.5, reviews: 0,
        created_at: new Date().toISOString(), ...fields,
      });
    }
    const supplier = await db.collection('suppliers').findOne({ email }, { projection: { _id: 0 } });
    return attachSession(ok({ supplier }), ROLES.SUPPLIER, email);
  }

  if (path === '/suppliers/me' && method === 'GET') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    return ok({ supplier });
  }

  // =========================================================================
  // REQUESTS
  // =========================================================================

  if (path === '/extract' && method === 'POST') {
    const { text } = await readJson(req);
    if (!text?.trim()) return err('text is required');
    if (!hasLlm()) {
      return ok({ requirement: extractRequirementLocally(text), degraded: true });
    }
    try {
      const requirement = await extractRequirement(text);
      return ok({ requirement });
    } catch (error) {
      console.error('[extract] LLM failed, falling back to local parser:', error.message);
      return ok({ requirement: extractRequirementLocally(text), degraded: true });
    }
  }

  if (path === '/requests' && method === 'POST') {
    const body = await readJson(req);
    if (!body.requirement || typeof body.requirement !== 'object') return err('requirement required');
    let name = body.buyer_name || 'Guest Buyer';
    if (buyer) {
      const user = await db.collection('users').findOne({ email: buyer }, { projection: { name: 1 } });
      if (user?.name) name = user.name;
    }
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      buyer_name: name,
      buyer_email: buyer || null,
      raw_text: String(body.raw_text || '').slice(0, 2000),
      requirement: body.requirement,
      status: 'open',
      auction_started_at: now,
      auction_ends_at: new Date(Date.now() + AUCTION_WINDOW_MS).toISOString(),
      created_at: now,
    };
    await db.collection('requests').insertOne(doc);
    // Alerts and real supplier auto-bids run in the background.
    notifySuppliersOfRequest(db, doc).catch((e) => console.error('[notify] suppliers', e.message));
    runAutoBidMatching(db, doc).catch((e) => console.error('[autobid]', e.message));
    return ok({ request: doc });
  }

  // Supplier-facing feed of live requests.
  if (path === '/requests' && method === 'GET') {
    if (!supplierSession) return err('supplier sign in required', 401);
    const status = url.searchParams.get('status');
    const query = status ? { status } : {};
    const requests = await db.collection('requests')
      .find(query, { projection: { _id: 0, raw_text: 0 } })
      .sort({ created_at: -1 }).limit(60).toArray();

    // Show suppliers whether they have already bid.
    const supplier = await currentSupplier(db, req);
    const mine = supplier
      ? await db.collection('offers')
          .find({ supplier_id: supplier.id, request_id: { $in: requests.map((r) => r.id) } }, { projection: { _id: 0, request_id: 1, id: 1, price_inr: 1, status: 1 } })
          .toArray()
      : [];
    const byRequest = new Map(mine.map((o) => [o.request_id, o]));
    return ok({
      requests: requests.map((r) => ({
        ...r,
        buyer_email: undefined, // suppliers never see buyer contact details
        my_offer: byRequest.get(r.id) || null,
      })),
    });
  }

  const requestMatch = path.match(/^\/requests\/([^/]+)$/);
  if (requestMatch && method === 'GET') {
    const request = await db.collection('requests').findOne({ id: requestMatch[1] }, { projection: { _id: 0 } });
    if (!request) return err('not found', 404);
    if (!canReadRequest(request, { buyer, supplier: supplierSession })) return err('not allowed', 403);
    const offers = await db.collection('offers')
      .find({ request_id: request.id }, { projection: { _id: 0, supplier_phone: 0 } })
      .sort({ value_score: -1, price_inr: 1 }).toArray();
    return ok({ request, offers });
  }

  // The live auction endpoint. Polling this drives the whole real-time board.
  const liveMatch = path.match(/^\/requests\/([^/]+)\/live$/);
  if (liveMatch && (method === 'GET' || method === 'POST')) {
    const request = await db.collection('requests').findOne({ id: liveMatch[1] });
    if (!request) return err('request not found', 404);
    if (!canReadRequest(request, { buyer, supplier: supplierSession })) return err('not allowed', 403);
    const result = await advanceAuction(db, request);
    return ok({
      request: { ...request, _id: undefined },
      offers: result.offers.map((o) => ({ ...o, supplier_phone: undefined })),
      auction: result.auction,
      changes: result.changes,
    });
  }

  // A supplier posts a manual quote.
  const offerMatch = path.match(/^\/requests\/([^/]+)\/offers$/);
  if (offerMatch && method === 'POST') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    if (supplier.status !== 'approved') return err('your supplier account is awaiting approval', 403);

    const request = await db.collection('requests').findOne({ id: offerMatch[1] });
    if (!request) return err('request not found', 404);
    if (request.status !== 'open') return err('this request is closed', 409);

    const body = await readJson(req);
    const price = Number(body.price_inr);
    if (!Number.isFinite(price) || price <= 0) return err('a valid price_inr is required');

    const existing = await db.collection('offers').findOne({ request_id: request.id, supplier_id: supplier.id });
    const days = Number.isFinite(Number(body.delivery_days)) ? Math.max(0, Number(body.delivery_days)) : 2;

    const fields = {
      supplier_id: supplier.id,
      supplier_email: supplier.email,
      supplier_phone: supplier.phone || null,
      supplier_name: supplier.business_name + (supplier.city ? ' - ' + supplier.city : ''),
      supplier_type: supplier.supplier_type || 'retail_store',
      price_inr: price,
      delivery_days: days,
      delivery_note: body.delivery_note || (days === 0 ? 'Same-day delivery' : days === 1 ? 'Next-day delivery' : `${days}-day shipping`),
      warranty: body.warranty || '1 year manufacturer',
      rating: supplier.rating || 4.5,
      reviews: supplier.reviews || 0,
      distance_km: body.distance_km != null ? Number(body.distance_km) : null,
      validity_hours: Number(body.validity_hours) || 24,
      extras: body.extras || '',
      message: body.message || '',
      source: 'supplier_manual',
      is_demo: false,
    };
    const scored = computeValueScore(fields, request.requirement);

    if (existing) {
      // Re-bidding updates the existing offer and records the undercut.
      await db.collection('offers').updateOne(
        { id: existing.id },
        { $set: { ...fields, ...scored, previous_price: existing.price_inr > price ? existing.price_inr : existing.previous_price, last_bid_at: new Date().toISOString() } }
      );
      const offer = await db.collection('offers').findOne({ id: existing.id }, { projection: { _id: 0 } });
      notifyBuyerOfOffer(db, request, offer).catch(() => null);
      return ok({ offer, updated: true });
    }

    const offer = {
      id: uuidv4(), request_id: request.id, status: 'pending',
      created_at: new Date().toISOString(), ...fields, ...scored,
    };
    await db.collection('offers').insertOne(offer);
    notifyBuyerOfOffer(db, request, offer).catch(() => null);
    return ok({ offer });
  }

  // Offers this supplier has made.
  if (path === '/offers/mine' && method === 'GET') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const offers = await db.collection('offers')
      .find({ supplier_id: supplier.id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 }).limit(100).toArray();
    const requests = await db.collection('requests')
      .find({ id: { $in: offers.map((o) => o.request_id) } }, { projection: { _id: 0, id: 1, requirement: 1, status: 1 } })
      .toArray();
    const byId = new Map(requests.map((r) => [r.id, r]));
    return ok({ offers: offers.map((o) => ({ ...o, request: byId.get(o.request_id) || null })) });
  }

  // Buyer accepts an offer.
  const acceptMatch = path.match(/^\/offers\/([^/]+)\/accept$/);
  if (acceptMatch && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const offer = await db.collection('offers').findOne({ id: acceptMatch[1] });
    if (!offer) return err('offer not found', 404);
    const request = await db.collection('requests').findOne({ id: offer.request_id });
    if (!request) return err('request not found', 404);
    if (request.buyer_email && request.buyer_email !== buyer) return err('not allowed', 403);

    // Acceptance requires a verified payment for this offer.
    const paid = await db.collection('payments').findOne({ offer_id: offer.id, status: 'paid' });
    if (!paid) return err('payment required before accepting an offer', 402);

    await db.collection('offers').updateOne({ id: offer.id }, { $set: { status: 'accepted', accepted_at: new Date().toISOString() } });
    await db.collection('offers').updateMany(
      { request_id: offer.request_id, id: { $ne: offer.id } },
      { $set: { status: 'rejected' } }
    );
    await db.collection('requests').updateOne(
      { id: offer.request_id },
      { $set: { status: 'closed', accepted_offer_id: offer.id, closed_at: new Date().toISOString() } }
    );
    const order = await createOrder(db, { payment: paid, offer, request });
    notifySupplierOfWin(db, offer, request).catch(() => null);
    return ok({ ok: true, order });
  }

  const groupSuggestMatch = path.match(/^\/requests\/([^/]+)\/group-suggestion$/);
  if (groupSuggestMatch && method === 'GET') {
    const request = await db.collection('requests').findOne({ id: groupSuggestMatch[1] });
    if (!request) return err('not found', 404);
    if (!canReadRequest(request, { buyer, supplier: supplierSession })) return err('not allowed', 403);
    const requirement = request.requirement || {};
    const productKey = `${requirement.brand || ''}_${requirement.model || requirement.product || ''}_${requirement.storage || ''}`
      .toLowerCase().replace(/\s+/g, '_');
    const existingGroup = await db.collection('groups').findOne({ product_key: productKey, status: 'open' }, { projection: { _id: 0 } });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const similar = await db.collection('requests').countDocuments({
      id: { $ne: request.id },
      'requirement.brand': requirement.brand,
      'requirement.sub_category': requirement.sub_category,
      created_at: { $gte: weekAgo },
    });
    return ok({ existing_group: existingGroup, similar_count: similar, product_key: productKey });
  }

  // =========================================================================
  // CHAT
  // =========================================================================

  /** Both sides of an offer conversation, for permission checks. */
  async function chatParticipants(offerId) {
    const offer = await db.collection('offers').findOne({ id: offerId }, { projection: { _id: 0 } });
    if (!offer) return null;
    const request = await db.collection('requests').findOne({ id: offer.request_id }, { projection: { _id: 0 } });
    return { offer, request };
  }

  if (path === '/messages' && method === 'POST') {
    const body = await readJson(req);
    if (!body.offer_id || !String(body.text || '').trim()) return err('offer_id and text required');
    const context = await chatParticipants(body.offer_id);
    if (!context) return err('offer not found', 404);

    const isBuyer = buyer && (!context.request?.buyer_email || context.request.buyer_email === buyer);
    const isSupplier = supplierSession && context.offer.supplier_email === supplierSession;
    if (!isBuyer && !isSupplier) return err('not allowed', 403);

    const sender = isSupplier ? 'supplier' : 'buyer';
    let senderName = context.offer.supplier_name;
    if (sender === 'buyer') {
      const user = await db.collection('users').findOne({ email: buyer }, { projection: { name: 1 } });
      senderName = user?.name || 'Buyer';
    }

    const message = {
      id: uuidv4(),
      offer_id: body.offer_id,
      request_id: context.offer.request_id,
      sender, sender_name: senderName,
      text: String(body.text).slice(0, 2000),
      read: false,
      created_at: new Date().toISOString(),
    };
    await db.collection('messages').insertOne(message);
    notifyChatMessage(db, message, context).catch(() => null);
    return ok({ message });
  }

  const messagesMatch = path.match(/^\/messages\/([^/]+)$/);
  if (messagesMatch && method === 'GET') {
    const context = await chatParticipants(messagesMatch[1]);
    if (!context) return err('offer not found', 404);
    const isBuyer = buyer && (!context.request?.buyer_email || context.request.buyer_email === buyer);
    const isSupplier = supplierSession && context.offer.supplier_email === supplierSession;
    if (!isBuyer && !isSupplier) return err('not allowed', 403);

    const since = url.searchParams.get('since');
    const query = { offer_id: messagesMatch[1] };
    if (since) query.created_at = { $gt: since };
    const messages = await db.collection('messages').find(query, { projection: { _id: 0 } }).sort({ created_at: 1 }).toArray();
    return ok({ messages, viewer: isSupplier ? 'supplier' : 'buyer' });
  }

  const readMatch = path.match(/^\/messages\/([^/]+)\/read$/);
  if (readMatch && method === 'POST') {
    const context = await chatParticipants(readMatch[1]);
    if (!context) return err('offer not found', 404);
    const isBuyer = buyer && (!context.request?.buyer_email || context.request.buyer_email === buyer);
    const isSupplier = supplierSession && context.offer.supplier_email === supplierSession;
    if (!isBuyer && !isSupplier) return err('not allowed', 403);
    const other = isSupplier ? 'buyer' : 'supplier';
    await db.collection('messages').updateMany(
      { offer_id: readMatch[1], sender: other, read: false },
      { $set: { read: true, read_at: new Date().toISOString() } }
    );
    return ok({ ok: true });
  }

  // =========================================================================
  // PAYMENTS
  // =========================================================================

  if (path === '/payments/order' && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const { offer_id, wallet_apply_inr } = await readJson(req);
    if (!offer_id) return err('offer_id required');

    const offer = await db.collection('offers').findOne({ id: offer_id });
    if (!offer) return err('offer not found', 404);
    if (offer.status === 'rejected') return err('this offer is no longer available', 409);

    const request = await db.collection('requests').findOne({ id: offer.request_id });
    if (!request) return err('request not found', 404);
    if (request.buyer_email && request.buyer_email !== buyer) return err('not allowed', 403);
    // Claim a guest request on first purchase.
    if (!request.buyer_email) {
      await db.collection('requests').updateOne({ id: request.id }, { $set: { buyer_email: buyer } });
    }

    // The amount always comes from the stored offer, never the client.
    const amount = Number(offer.price_inr);
    if (!Number.isFinite(amount) || amount <= 0) return err('this offer has an invalid price', 409);

    let walletUsed = 0;
    const requested = Number(wallet_apply_inr) || 0;
    if (requested > 0) {
      const wallet = await db.collection('wallets').findOne({ email: buyer });
      if (wallet?.balance_inr > 0) {
        walletUsed = Math.max(0, Math.min(wallet.balance_inr, requested, amount - 1));
      }
    }
    const finalAmount = amount - walletUsed;
    const receipt = 'BB_' + String(offer_id).slice(0, 8) + '_' + Date.now();
    const amountPaise = Math.round(finalAmount * 100);

    try {
      // In a test environment never touch the live gateway, even when keys are
      // configured: a UAT must not create real Razorpay orders.
      const order = paymentsTestMode()
        ? { orderId: 'test_order_' + uuidv4().slice(0, 12), amount: amountPaise, currency: 'INR', mocked: true }
        : await createRazorpayOrder(amountPaise, receipt);
      const payment = {
        id: uuidv4(),
        offer_id, request_id: offer.request_id, receipt,
        buyer_email: buyer,
        amount_inr: finalAmount, amount_paise: amountPaise,
        original_amount_inr: amount,
        wallet_used_inr: walletUsed,
        razorpay_order_id: order.orderId,
        status: 'created',
        mocked: order.mocked,
        review_status: 'unreviewed',
        created_at: new Date().toISOString(),
      };
      await db.collection('payments').insertOne(payment);
      return ok({
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID || null,
        mocked: order.mocked,
        wallet_used_inr: walletUsed,
        final_amount_inr: finalAmount,
        original_amount_inr: amount,
      });
    } catch (error) {
      console.error('[payments] order failed', error);
      return err('could not start payment: ' + error.message, 502);
    }
  }

  if (path === '/payments/verify' && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await readJson(req);
    const payment = await db.collection('payments').findOne({ razorpay_order_id });
    if (!payment) return err('payment not found', 404);
    if (payment.buyer_email !== buyer) return err('not allowed', 403);
    if (payment.status === 'paid') {
      return ok({ ok: true, status: 'paid', already: true });
    }

    // A mock order only settles when Razorpay is genuinely unconfigured, or
    // when test mode is explicitly switched on outside production.
    const valid = paymentsTestMode()
      ? true
      : payment.mocked
        ? !hasRazorpay()
        : verifyRazorpaySignature({ order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature });

    const status = valid ? 'paid' : 'signature_failed';
    await db.collection('payments').updateOne(
      { razorpay_order_id },
      {
        $set: {
          status,
          razorpay_payment_id: razorpay_payment_id || null,
          verified_at: new Date().toISOString(),
          ...(paymentsTestMode() ? { test_mode: true } : {}),
        },
      }
    );
    if (!valid) return err('payment signature verification failed', 400, { status });

    const offer = await db.collection('offers').findOne({ id: payment.offer_id });

    // Payment confirms the order; delivery starts at "confirmed", not "delivered".
    await db.collection('offers').updateOne({ id: payment.offer_id }, { $set: { payment_status: 'paid' } });

    const user = await db.collection('users').findOne({ email: buyer });
    const newSpent = (user?.total_spent_inr || 0) + (payment.original_amount_inr || payment.amount_inr);
    const tier = computeTier(newSpent);
    await db.collection('users').updateOne({ email: buyer }, { $set: { total_spent_inr: newSpent, tier: tier.tier } });

    let wallet = await db.collection('wallets').findOne({ email: buyer });
    if (!wallet) {
      wallet = { email: buyer, balance_inr: 0, transactions: [], created_at: new Date().toISOString() };
      await db.collection('wallets').insertOne({ ...wallet });
    }
    const now = new Date().toISOString();
    const used = payment.wallet_used_inr || 0;
    const cashback = Math.round((payment.original_amount_inr || payment.amount_inr) * (tier.cashback_pct / 100));
    const transactions = [];
    if (used > 0) transactions.push({ id: uuidv4(), type: 'debit', amount: used, reason: 'Wallet applied on purchase', offer_id: payment.offer_id, at: now });
    transactions.push({ id: uuidv4(), type: 'credit', amount: cashback, reason: `${tier.cashback_pct}% ${tier.label} cashback`, offer_id: payment.offer_id, at: now });
    await db.collection('wallets').updateOne(
      { email: buyer },
      { $set: { balance_inr: (wallet.balance_inr || 0) - used + cashback }, $push: { transactions: { $each: transactions } } }
    );

    await addNotification(db, {
      audience: 'buyer', recipient: buyer, type: 'payment',
      title: '✅ Payment successful',
      body: `₹${Number(payment.amount_inr).toLocaleString('en-IN')} paid to ${offer?.supplier_name || 'supplier'}`,
      data: { offer_id: payment.offer_id, cashback_inr: cashback },
    });

    return ok({ ok: true, status: 'paid', cashback_inr: cashback, tier });
  }

  // =========================================================================
  // ORDERS & DELIVERY
  // =========================================================================

  if (path === '/orders' && method === 'GET') {
    if (buyer) {
      const orders = await db.collection('orders').find({ buyer_email: buyer }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray();
      return ok({ orders });
    }
    const supplier = await currentSupplier(db, req);
    if (supplier) {
      const orders = await db.collection('orders').find({ supplier_id: supplier.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(50).toArray();
      return ok({ orders });
    }
    return err('sign in required', 401);
  }

  const orderTrackMatch = path.match(/^\/orders\/([^/]+)\/track$/);
  if (orderTrackMatch && method === 'GET') {
    const order = await db.collection('orders').findOne({ id: orderTrackMatch[1] }, { projection: { _id: 0 } });
    if (!order) return err('order not found', 404);
    const isBuyer = buyer && order.buyer_email === buyer;
    const isSupplier = supplierSession && order.supplier_email === supplierSession;
    if (!isBuyer && !isSupplier) return err('not allowed', 403);
    return ok({ delivery: await trackOrder(db, order) });
  }

  // Track by offer id, which is what the buyer UI holds.
  const deliveryMatch = path.match(/^\/delivery\/([^/]+)$/);
  if (deliveryMatch && method === 'GET') {
    const order = await findOrderByOffer(db, deliveryMatch[1]);
    if (!order) return err('no order for this offer yet', 404);
    const isBuyer = buyer && order.buyer_email === buyer;
    const isSupplier = supplierSession && order.supplier_email === supplierSession;
    if (!isBuyer && !isSupplier) return err('not allowed', 403);
    return ok({ delivery: await trackOrder(db, order) });
  }

  // Supplier moves an order along.
  const stageMatch = path.match(/^\/orders\/([^/]+)\/stage$/);
  if (stageMatch && method === 'POST') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const order = await db.collection('orders').findOne({ id: stageMatch[1] }, { projection: { _id: 0 } });
    if (!order) return err('order not found', 404);
    if (order.supplier_id !== supplier.id) return err('not allowed', 403);
    const { stage } = await readJson(req);
    if (!STAGE_KEYS.includes(stage)) return err('invalid stage');
    // Once a supplier takes control, stop the automatic timeline.
    await db.collection('orders').updateOne({ id: order.id }, { $set: { auto_advance: false } });
    const updated = await setOrderStage(db, { ...order, auto_advance: false }, stage, supplier.email);
    return ok({ ok: true, stage: updated.stage });
  }

  // =========================================================================
  // REVIEWS
  // =========================================================================

  if (path === '/reviews' && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const body = await readJson(req);
    const rating = Number(body.rating);
    if (!body.offer_id || !Number.isFinite(rating)) return err('offer_id and rating required');

    const order = await findOrderByOffer(db, body.offer_id);
    if (!order) return err('you can only review an order you placed', 403);
    if (order.buyer_email !== buyer) return err('not allowed', 403);

    const existing = await db.collection('reviews').findOne({ offer_id: body.offer_id });
    if (existing) return err('you have already reviewed this order', 409);

    const review = {
      id: uuidv4(),
      offer_id: body.offer_id,
      order_id: order.id,
      request_id: order.request_id,
      supplier_name: order.supplier_name,
      supplier_id: order.supplier_id || null,
      buyer_name: order.buyer_name || 'Buyer',
      buyer_email: buyer,
      rating: Math.max(1, Math.min(5, rating)),
      title: String(body.title || '').slice(0, 140),
      comment: String(body.comment || '').slice(0, 2000),
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      visibility: 'visible',
      created_at: new Date().toISOString(),
    };
    await db.collection('reviews').insertOne(review);
    await db.collection('offers').updateOne({ id: body.offer_id }, { $set: { reviewed: true, review_rating: review.rating } });

    if (order.supplier_id) {
      const all = await db.collection('reviews').find({ supplier_id: order.supplier_id, visibility: { $ne: 'hidden' } }).toArray();
      const average = all.reduce((sum, r) => sum + r.rating, 0) / (all.length || 1);
      await db.collection('suppliers').updateOne(
        { id: order.supplier_id },
        { $set: { rating: Math.round(average * 10) / 10, reviews: all.length } }
      );
    }
    return ok({ review });
  }

  const reviewOfferMatch = path.match(/^\/reviews\/offer\/([^/]+)$/);
  if (reviewOfferMatch && method === 'GET') {
    const review = await db.collection('reviews').findOne({ offer_id: reviewOfferMatch[1] }, { projection: { _id: 0 } });
    return ok({ review: review || null });
  }

  const reviewSupplierMatch = path.match(/^\/reviews\/supplier\/(.+)$/);
  if (reviewSupplierMatch && method === 'GET') {
    const reviews = await db.collection('reviews')
      .find({ supplier_id: reviewSupplierMatch[1], visibility: { $ne: 'hidden' } }, { projection: { _id: 0, buyer_email: 0 } })
      .sort({ created_at: -1 }).limit(50).toArray();
    return ok({ reviews });
  }

  // =========================================================================
  // SUPPLIER ANALYTICS & AUTO-BID RULES
  // =========================================================================

  if (path === '/analytics/supplier' && method === 'GET') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);

    const [totalRequests, openRequests, myOffers] = await Promise.all([
      db.collection('requests').countDocuments({}),
      db.collection('requests').countDocuments({ status: 'open' }),
      db.collection('offers').find({ supplier_id: supplier.id }, { projection: { _id: 0 } }).toArray(),
    ]);

    const won = myOffers.filter((o) => o.status === 'accepted');
    const winRate = myOffers.length ? Math.round((won.length / myOffers.length) * 100) : 0;

    // How far our losing bids sat above the winner.
    const lostRequestIds = myOffers.filter((o) => o.status === 'rejected').map((o) => o.request_id);
    let gapSum = 0, gapCount = 0;
    if (lostRequestIds.length) {
      const closed = await db.collection('requests')
        .find({ id: { $in: lostRequestIds }, accepted_offer_id: { $ne: null } }).toArray();
      const winners = await db.collection('offers')
        .find({ id: { $in: closed.map((r) => r.accepted_offer_id).filter(Boolean) } }).toArray();
      const winnerById = new Map(winners.map((w) => [w.id, w]));
      for (const request of closed) {
        const winner = winnerById.get(request.accepted_offer_id);
        const mine = myOffers.find((o) => o.request_id === request.id);
        if (winner && mine && mine.id !== winner.id && winner.price_inr > 0) {
          gapSum += (mine.price_inr - winner.price_inr) / winner.price_inr;
          gapCount++;
        }
      }
    }

    const recentRequests = await db.collection('requests').find({}, { projection: { _id: 0, requirement: 1 } }).sort({ created_at: -1 }).limit(200).toArray();
    const tally = (key) => {
      const counts = {};
      for (const r of recentRequests) {
        const value = r.requirement?.[key];
        if (value) counts[value] = (counts[value] || 0) + 1;
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    const revenue = await db.collection('orders').aggregate([
      { $match: { supplier_id: supplier.id } },
      { $group: { _id: null, total: { $sum: '$amount_inr' }, count: { $sum: 1 } } },
    ]).toArray();

    return ok({
      supplier,
      stats: {
        total_requests_available: totalRequests,
        open_requests: openRequests,
        offers_submitted: myOffers.length,
        offers_won: won.length,
        win_rate_pct: winRate,
        avg_price_gap_pct: gapCount ? Math.round((gapSum / gapCount) * 10000) / 100 : 0,
        revenue_inr: revenue[0]?.total || 0,
        orders: revenue[0]?.count || 0,
      },
      hot_cities: tally('location').map(([city, count]) => ({ city, count })),
      hot_categories: tally('sub_category').map(([sub_category, count]) => ({ sub_category, count })),
      recent_offers: myOffers.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 5),
    });
  }

  if (path === '/supplier/rules' && method === 'GET') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const rules = await db.collection('supplier_rules')
      .find({ supplier_id: supplier.id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    return ok({ rules });
  }

  if (path === '/supplier/rules' && method === 'POST') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const body = await readJson(req);
    const rule = {
      id: uuidv4(),
      supplier_id: supplier.id,
      supplier_email: supplier.email,
      name: body.name || 'My auto-bid rule',
      brand: body.brand || null,
      sub_category: body.sub_category || 'any',
      city: body.city || null,
      min_price: body.min_price ? Number(body.min_price) : null,
      discount_pct: Number(body.discount_pct) || 5,
      delivery_days: Number(body.delivery_days) || 2,
      warranty: body.warranty || '1 year manufacturer',
      extras: body.extras || '',
      validity_hours: Number(body.validity_hours) || 24,
      message: body.message || '',
      enabled: body.enabled !== false,
      created_at: new Date().toISOString(),
    };
    await db.collection('supplier_rules').insertOne(rule);
    return ok({ rule });
  }

  const ruleIdMatch = path.match(/^\/supplier\/rules\/([^/]+)$/);
  if (ruleIdMatch && method === 'DELETE') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const result = await db.collection('supplier_rules').deleteOne({ id: ruleIdMatch[1], supplier_id: supplier.id });
    if (!result.deletedCount) return err('rule not found', 404);
    return ok({ ok: true });
  }

  const ruleToggleMatch = path.match(/^\/supplier\/rules\/([^/]+)\/toggle$/);
  if (ruleToggleMatch && method === 'POST') {
    const supplier = await currentSupplier(db, req);
    if (!supplier) return err('supplier sign in required', 401);
    const rule = await db.collection('supplier_rules').findOne({ id: ruleToggleMatch[1], supplier_id: supplier.id });
    if (!rule) return err('rule not found', 404);
    await db.collection('supplier_rules').updateOne({ id: rule.id }, { $set: { enabled: !rule.enabled } });
    return ok({ ok: true, enabled: !rule.enabled });
  }

  // =========================================================================
  // GROUP BUYING
  // =========================================================================

  if (path === '/groups' && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const body = await readJson(req);
    const request = await db.collection('requests').findOne({ id: body.request_id });
    if (!request) return err('request not found', 404);
    if (request.buyer_email && request.buyer_email !== buyer) return err('not allowed', 403);
    const requirement = request.requirement || {};
    const productKey = `${requirement.brand || ''}_${requirement.model || requirement.product || ''}_${requirement.storage || ''}`
      .toLowerCase().replace(/\s+/g, '_');
    const existing = await db.collection('groups').findOne({ product_key: productKey, status: 'open' }, { projection: { _id: 0 } });
    if (existing) return ok({ group: existing, joined: false });
    const group = {
      id: uuidv4(),
      seed_request_id: request.id,
      product_key: productKey,
      requirement,
      members: [{ email: buyer, name: request.buyer_name, joined_at: new Date().toISOString() }],
      target_size: 5,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    await db.collection('groups').insertOne(group);
    return ok({ group });
  }

  const groupJoinMatch = path.match(/^\/groups\/([^/]+)\/join$/);
  if (groupJoinMatch && method === 'POST') {
    if (!buyer) return err('sign in required', 401);
    const group = await db.collection('groups').findOne({ id: groupJoinMatch[1] });
    if (!group) return err('group not found', 404);
    if (group.members.some((m) => m.email === buyer)) return err('you have already joined this group', 409);
    const user = await db.collection('users').findOne({ email: buyer }, { projection: { name: 1 } });
    await db.collection('groups').updateOne(
      { id: group.id },
      { $push: { members: { email: buyer, name: user?.name || 'Buyer', joined_at: new Date().toISOString() } } }
    );
    const updated = await db.collection('groups').findOne({ id: group.id }, { projection: { _id: 0 } });
    return ok({ group: updated });
  }

  // =========================================================================
  // PUBLIC STOREFRONT
  // =========================================================================

  const storeMatch = path.match(/^\/store\/(.+)$/);
  if (storeMatch && method === 'GET') {
    const slug = decodeURIComponent(storeMatch[1]);
    let supplier = await db.collection('suppliers').findOne(
      { $or: [{ id: slug }, { email: normaliseEmail(slug) }] },
      { projection: { _id: 0, gst: 0, phone: 0 } }
    );
    if (!supplier) {
      const candidates = await db.collection('suppliers').find({}, { projection: { _id: 0, gst: 0, phone: 0 } }).toArray();
      supplier = candidates.find((s) => (s.business_name || '').toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
    }
    if (!supplier) return err('store not found', 404);

    const [offers, reviews, rules] = await Promise.all([
      db.collection('offers').find({ supplier_id: supplier.id }, { projection: { _id: 0, supplier_phone: 0, supplier_email: 0 } }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection('reviews').find({ supplier_id: supplier.id, visibility: { $ne: 'hidden' } }, { projection: { _id: 0, buyer_email: 0 } }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection('supplier_rules').find({ supplier_id: supplier.id, enabled: true }, { projection: { _id: 0 } }).toArray(),
    ]);
    return ok({
      supplier, offers, reviews, rules,
      stats: {
        total_offers: offers.length,
        accepted: offers.filter((o) => o.status === 'accepted').length,
        avg_rating: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : supplier.rating,
      },
    });
  }

  // =========================================================================
  // PUSH REGISTRATION
  // =========================================================================

  if (path === '/push/register' && method === 'POST') {
    const { expo_token, platform } = await readJson(req);
    const owner = buyer || supplierSession;
    if (!expo_token) return err('expo_token required');
    if (!owner) return err('sign in required', 401);
    await db.collection('push_tokens').updateOne(
      { expo_token },
      { $set: { email: owner, expo_token, platform: platform || 'ios', updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    return ok({ ok: true });
  }

  // =========================================================================
  // ADMIN
  // =========================================================================

  if (path === '/admin/overview' && method === 'GET') {
    const actor = sessionAdmin(req);
    await auditAdmin(db, 'view_overview', actor);
    const [requests, suppliers, offers, payments, orders] = await Promise.all([
      db.collection('requests').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection('suppliers').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection('offers').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(200).toArray(),
      db.collection('payments').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection('orders').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(100).toArray(),
    ]);
    const offersByRequest = offers.reduce((map, offer) => {
      map[offer.request_id] = (map[offer.request_id] || 0) + 1;
      return map;
    }, {});
    return ok({
      requests: requests.map((r) => ({ ...r, offer_count: offersByRequest[r.id] || 0 })),
      suppliers, offers, payments, orders,
      metrics: {
        request_count: requests.length,
        offer_count: offers.length,
        pending_offers: offers.filter((o) => o.status === 'pending').length,
        accepted_offers: offers.filter((o) => o.status === 'accepted').length,
        paid_orders: payments.filter((p) => p.status === 'paid').length,
        payment_volume_inr: payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + (p.amount_inr || 0), 0),
        open_orders: orders.filter((o) => o.stage !== 'delivered').length,
        supplier_count: suppliers.length,
      },
    });
  }

  if (path === '/admin/audit' && method === 'GET') {
    const log = await db.collection('admin_audit').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(200).toArray();
    return ok({ audit: log });
  }

  if (path === '/admin/records' && method === 'GET') {
    const actor = sessionAdmin(req);
    const type = url.searchParams.get('type') || 'summary';
    const search = url.searchParams.get('search')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);

    if (type === 'settings') {
      const settings = await db.collection('platform_settings').find({}, { projection: { _id: 0 } }).sort({ key: 1 }).toArray();
      await auditAdmin(db, 'view_settings', actor);
      return ok({ records: settings });
    }

    const collections = {
      customers: 'users', suppliers: 'suppliers', requests: 'requests', offers: 'offers',
      payments: 'payments', reviews: 'reviews', messages: 'messages', orders: 'orders',
    };
    const collection = collections[type];
    if (!collection) return err('unsupported admin record type');

    const query = {};
    if (status) query.status = status;
    if (search) {
      const regex = { $regex: safeRegex(search), $options: 'i' };
      const fields = {
        customers: [{ name: regex }, { email: regex }],
        suppliers: [{ business_name: regex }, { email: regex }],
        requests: [{ buyer_name: regex }, { buyer_email: regex }, { 'requirement.product': regex }],
        offers: [{ supplier_name: regex }, { supplier_id: regex }],
        payments: [{ buyer_email: regex }, { offer_id: regex }],
        reviews: [{ buyer_email: regex }, { supplier_name: regex }, { comment: regex }],
        orders: [{ buyer_email: regex }, { supplier_name: regex }, { tracking_id: regex }],
        messages: [{ text: regex }, { sender_name: regex }],
      }[type];
      query.$or = fields;
    }
    const records = await db.collection(collection).find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(limit).toArray();
    await auditAdmin(db, `view_${type}`, actor, { search: search || null, status: status || null, count: records.length });
    return ok({ records });
  }

  const adminCustomerStatus = path.match(/^\/admin\/customers\/([^/]+)\/status$/);
  if (adminCustomerStatus && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const email = normaliseEmail(decodeURIComponent(adminCustomerStatus[1]));
    const { status, reason } = await readJson(req);
    if (!['active', 'suspended'].includes(status)) return err('invalid customer status');
    const before = await db.collection('users').findOne({ email }, { projection: { _id: 0, status: 1 } });
    if (!before) return err('customer not found', 404);
    await db.collection('users').updateOne({ email }, {
      $set: { status, status_reason: reason || '', status_changed_at: new Date().toISOString(), status_changed_by: actor },
    });
    await auditAdmin(db, 'change_customer_status', actor, { email, before: before.status || 'active', after: status, reason: reason || null });
    return ok({ ok: true, status });
  }

  const adminWallet = path.match(/^\/admin\/customers\/([^/]+)\/wallet$/);
  if (adminWallet && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const email = normaliseEmail(decodeURIComponent(adminWallet[1]));
    const { amount_inr, reason } = await readJson(req);
    const amount = Number(amount_inr);
    if (!Number.isFinite(amount) || amount === 0) return err('amount_inr must be a non-zero number');
    let wallet = await db.collection('wallets').findOne({ email });
    if (!wallet) {
      wallet = { email, balance_inr: 0, transactions: [], created_at: new Date().toISOString() };
      await db.collection('wallets').insertOne({ ...wallet });
    }
    const balance = (wallet.balance_inr || 0) + amount;
    if (balance < 0) return err('wallet balance cannot go negative');
    await db.collection('wallets').updateOne({ email }, {
      $set: { balance_inr: balance },
      $push: { transactions: { id: uuidv4(), type: amount > 0 ? 'credit' : 'debit', amount: Math.abs(amount), reason: reason || 'Admin adjustment', at: new Date().toISOString(), admin_email: actor } },
    });
    await auditAdmin(db, 'adjust_customer_wallet', actor, { email, amount_inr: amount, reason: reason || null });
    return ok({ ok: true, balance_inr: balance });
  }

  const adminSupplierStatus = path.match(/^\/admin\/suppliers\/([^/]+)\/status$/);
  if (adminSupplierStatus && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { status, reason } = await readJson(req);
    if (!['pending_review', 'approved', 'rejected', 'suspended'].includes(status)) return err('invalid supplier status');
    const before = await db.collection('suppliers').findOne({ id: adminSupplierStatus[1] }, { projection: { _id: 0 } });
    if (!before) return err('supplier not found', 404);
    await db.collection('suppliers').updateOne({ id: before.id }, {
      $set: { status, status_reason: reason || '', status_changed_at: new Date().toISOString(), status_changed_by: actor },
    });
    await auditAdmin(db, 'change_supplier_status', actor, { id: before.id, business_name: before.business_name, before: before.status, after: status, reason: reason || null });
    return ok({ ok: true, status });
  }

  const adminRequestStatus = path.match(/^\/admin\/requests\/([^/]+)\/status$/);
  if (adminRequestStatus && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { status, note } = await readJson(req);
    if (!['open', 'closed', 'cancelled', 'escalated'].includes(status)) return err('invalid request status');
    const before = await db.collection('requests').findOne({ id: adminRequestStatus[1] }, { projection: { _id: 0, status: 1 } });
    if (!before) return err('request not found', 404);
    await db.collection('requests').updateOne({ id: adminRequestStatus[1] }, {
      $set: { status, admin_note: note || '', updated_at: new Date().toISOString(), updated_by: actor },
    });
    await auditAdmin(db, 'change_request_status', actor, { id: adminRequestStatus[1], before: before.status, after: status, note: note || null });
    return ok({ ok: true, status });
  }

  const adminOfferStatus = path.match(/^\/admin\/offers\/([^/]+)\/status$/);
  if (adminOfferStatus && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { status, reason } = await readJson(req);
    if (!['pending', 'rejected', 'accepted'].includes(status)) return err('invalid offer status');
    const before = await db.collection('offers').findOne({ id: adminOfferStatus[1] }, { projection: { _id: 0 } });
    if (!before) return err('offer not found', 404);
    await db.collection('offers').updateOne({ id: before.id }, {
      $set: { status, admin_reason: reason || '', moderated_at: new Date().toISOString(), moderated_by: actor },
    });
    if (status === 'accepted') {
      await db.collection('offers').updateMany({ request_id: before.request_id, id: { $ne: before.id } }, { $set: { status: 'rejected' } });
      await db.collection('requests').updateOne({ id: before.request_id }, { $set: { status: 'closed', accepted_offer_id: before.id } });
    }
    await auditAdmin(db, 'change_offer_status', actor, { id: before.id, request_id: before.request_id, before: before.status, after: status, reason: reason || null });
    return ok({ ok: true, status });
  }

  const adminReviewVisibility = path.match(/^\/admin\/reviews\/([^/]+)\/visibility$/);
  if (adminReviewVisibility && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { visibility, reason } = await readJson(req);
    if (!['visible', 'hidden'].includes(visibility)) return err('invalid review visibility');
    const review = await db.collection('reviews').findOne({ id: adminReviewVisibility[1] }, { projection: { _id: 0 } });
    if (!review) return err('review not found', 404);
    await db.collection('reviews').updateOne({ id: review.id }, {
      $set: { visibility, moderation_reason: reason || '', moderated_at: new Date().toISOString(), moderated_by: actor },
    });
    await auditAdmin(db, 'moderate_review', actor, { id: review.id, before: review.visibility || 'visible', after: visibility, reason: reason || null });
    return ok({ ok: true, visibility });
  }

  const adminPaymentReview = path.match(/^\/admin\/payments\/([^/]+)\/review$/);
  if (adminPaymentReview && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { review_status, note } = await readJson(req);
    if (!['unreviewed', 'reconciled', 'investigate', 'refunded'].includes(review_status)) return err('invalid payment review status');
    const payment = await db.collection('payments').findOne({ id: adminPaymentReview[1] }, { projection: { _id: 0 } });
    if (!payment) return err('payment not found', 404);
    await db.collection('payments').updateOne({ id: payment.id }, {
      $set: { review_status, admin_note: note || '', reviewed_at: new Date().toISOString(), reviewed_by: actor },
    });
    await auditAdmin(db, 'review_payment', actor, { id: payment.id, before: payment.review_status || 'unreviewed', after: review_status, note: note || null });
    return ok({ ok: true, review_status });
  }

  if (path === '/admin/settings' && method === 'PATCH') {
    const actor = sessionAdmin(req);
    const { key, value } = await readJson(req);
    if (!/^[a-z][a-z0-9_]{1,60}$/.test(key || '') || /secret|password|token|key/.test(key)) {
      return err('invalid or reserved setting key');
    }
    await db.collection('platform_settings').updateOne(
      { key },
      { $set: { key, value, updated_at: new Date().toISOString(), updated_by: actor } },
      { upsert: true }
    );
    await auditAdmin(db, 'update_platform_setting', actor, { key, value });
    return ok({ ok: true, key, value });
  }

  return err(`route not found: ${method} ${path}`, 404);
}

async function handler(req, context) {
  try {
    return await route(req, context);
  } catch (error) {
    console.error('[api] unhandled error', error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500, headers: corsHeaders(req) });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
