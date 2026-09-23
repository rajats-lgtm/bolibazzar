#!/usr/bin/env node
/**
 * End-to-end smoke test against a running dev server.
 *
 * Walks the complete journey — OTP login, AI extraction, live auction, payment,
 * order, delivery tracking, chat, review — and asserts the authorization rules
 * actually hold.
 *
 *   node scripts/smoke.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://localhost:3000') + '/api';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(title) { console.log(`\n\x1b[1m${title}\x1b[0m`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A tiny cookie jar so each actor keeps their own session. */
function makeClient(label) {
  const jar = new Map();
  return {
    label,
    cookies: jar,
    async call(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...(options.headers || {}) };
      if (jar.size) headers.Cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      const response = await fetch(BASE + path, { ...options, headers, redirect: 'manual' });
      for (const raw of response.headers.getSetCookie?.() || []) {
        const [pair] = raw.split(';');
        const idx = pair.indexOf('=');
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (value === '') jar.delete(name); else jar.set(name, value);
      }
      const body = await response.json().catch(() => ({}));
      return { status: response.status, ok: response.ok, ...body };
    },
  };
}

const buyer = makeClient('buyer');
const supplier = makeClient('supplier');
const stranger = makeClient('stranger');

// --- health ----------------------------------------------------------------
section('Health');
const health = await buyer.call('/health');
check('API responds', health.status === 'ok', JSON.stringify(health).slice(0, 120));
console.log(`    razorpay_live=${health.razorpay_live} demo_bidders=${health.demo_bidders} window=${health.auction_window_seconds}s`);

// --- auth ------------------------------------------------------------------
section('Buyer OTP login');
const otp = await buyer.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: 'buyer@test.in' }) });
check('OTP requested', otp.ok === true, otp.error);
check('dev code returned (OTP_DEV_MODE)', !!otp.dev_code, 'no dev_code in response');

const badCode = await buyer.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: 'buyer@test.in', code: '000000' }) });
check('wrong code rejected', badCode.status === 401 || badCode.status === 400, `got ${badCode.status}`);

const login = await buyer.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: 'buyer@test.in', code: otp.dev_code, name: 'Priya Sharma' }) });
check('OTP verified, session issued', login.ok === true && !!login.user, login.error);
check('session cookie set', buyer.cookies.has('bb_buyer_session'));
check('tier computed', !!login.user?.tier?.label, JSON.stringify(login.user?.tier));

const session = await buyer.call('/auth/session');
check('session readable', session.buyer?.email === 'buyer@test.in', JSON.stringify(session.buyer).slice(0, 80));

section('Supplier OTP login');
const sOtp = await supplier.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: 'supplier@test.in', role: 'supplier' }) });
const sLogin = await supplier.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: 'supplier@test.in', code: sOtp.dev_code, role: 'supplier' }) });
check('supplier session issued', sLogin.ok === true && !!sLogin.supplier, sLogin.error);
check('supplier is approved', sLogin.supplier?.status === 'approved', sLogin.supplier?.status);

// --- authorization ---------------------------------------------------------
section('Authorization');
const noAuthMe = await stranger.call('/me');
check('GET /me requires auth', noAuthMe.status === 401, `got ${noAuthMe.status}`);
const noAuthWallet = await stranger.call('/wallet');
check('GET /wallet requires auth', noAuthWallet.status === 401, `got ${noAuthWallet.status}`);
const noAuthFeed = await stranger.call('/requests');
check('supplier feed requires supplier auth', noAuthFeed.status === 401, `got ${noAuthFeed.status}`);

// --- extraction ------------------------------------------------------------
section('AI requirement extraction');
const extract = await buyer.call('/extract', {
  method: 'POST',
  body: JSON.stringify({ text: 'I need iPhone 17 Pro Max 256GB Black under 1.2 lakh in Mumbai' }),
});
check('extraction returns a requirement', !!extract.requirement, extract.error);
if (extract.degraded) console.log('    \x1b[33m(LLM unreachable — local fallback parser used)\x1b[0m');
check('budget parsed', extract.requirement?.budget_inr === 120000, String(extract.requirement?.budget_inr));
check('location parsed', /mumbai/i.test(extract.requirement?.location || ''), extract.requirement?.location);

// --- request + live auction ------------------------------------------------
section('Live auction');
const created = await buyer.call('/requests', {
  method: 'POST',
  body: JSON.stringify({ requirement: extract.requirement, raw_text: 'iPhone 17 Pro Max under 1.2 lakh Mumbai' }),
});
check('request created', !!created.request?.id, created.error);
const requestId = created.request.id;
check('request owned by buyer', created.request.buyer_email === 'buyer@test.in');
check('auction window opened', !!created.request.auction_ends_at);

let live = await buyer.call(`/requests/${requestId}/live`);
check('auction endpoint responds', Array.isArray(live.offers), live.error);
const firstCount = live.offers.length;
console.log(`    t=0s  offers=${firstCount}  seconds_remaining=${live.auction?.seconds_remaining}`);

await sleep(6000);
live = await buyer.call(`/requests/${requestId}/live`);
console.log(`    t=6s  offers=${live.offers.length}`);
check('more bids arrive over time', live.offers.length > firstCount, `${firstCount} -> ${live.offers.length}`);
check('offers are ranked', live.offers.every((o, i, a) => i === 0 || a[i - 1].value_score >= o.value_score));
check('exactly one AI pick', live.offers.filter((o) => o.ai_pick).length === 1);
check('buyer contact not leaked to offers', live.offers.every((o) => o.supplier_phone === undefined));

await sleep(9000);
live = await buyer.call(`/requests/${requestId}/live`);
console.log(`    t=15s offers=${live.offers.length}  cheapest=₹${Math.min(...live.offers.map((o) => o.price_inr)).toLocaleString('en-IN')}`);
const dropped = live.offers.filter((o) => o.previous_price && o.previous_price > o.price_inr);
console.log(`    price drops so far: ${dropped.length}`);

// --- supplier bids manually ------------------------------------------------
section('Supplier manual bid');
const feed = await supplier.call('/requests');
check('supplier sees the request', feed.requests?.some((r) => r.id === requestId), feed.error);
check('buyer email hidden from supplier feed', feed.requests?.every((r) => r.buyer_email === undefined));

const targetPrice = Math.min(...live.offers.map((o) => o.price_inr)) - 3000;
const bid = await supplier.call(`/requests/${requestId}/offers`, {
  method: 'POST',
  body: JSON.stringify({ price_inr: targetPrice, delivery_days: 1, warranty: '1 year manufacturer', extras: 'Free case', message: 'Best price, ready to ship.' }),
});
check('supplier bid accepted', !!bid.offer?.id, bid.error);
check('bid attributed to the real supplier', bid.offer?.supplier_email === 'supplier@test.in');

const strangerBid = await stranger.call(`/requests/${requestId}/offers`, { method: 'POST', body: JSON.stringify({ price_inr: 1 }) });
check('bidding requires supplier auth', strangerBid.status === 401, `got ${strangerBid.status}`);

live = await buyer.call(`/requests/${requestId}/live`);
const mine = live.offers.find((o) => o.supplier_email === 'supplier@test.in');
check('the supplier bid appears on the board', !!mine, 'not found');
// Offers rank by value score, not price alone, so the cheapest need not be
// first. What must hold is that a ranking exists and one AI pick is flagged.
check('board stays ranked after a new bid', live.offers.every((o, i, a) => i === 0 || a[i - 1].value_score >= o.value_score));
check('still exactly one AI pick', live.offers.filter((o) => o.ai_pick).length === 1);

// --- payment ---------------------------------------------------------------
section('Payment');
const myOffer = live.offers.find((o) => o.id === bid.offer.id);
const acceptBeforePay = await buyer.call(`/offers/${myOffer.id}/accept`, { method: 'POST' });
check('cannot accept before paying', acceptBeforePay.status === 402, `got ${acceptBeforePay.status}`);

const order = await buyer.call('/payments/order', { method: 'POST', body: JSON.stringify({ offer_id: myOffer.id, wallet_apply_inr: 2000 }) });
check('payment order created', !!order.order_id, order.error);
check('amount taken from the stored offer', order.original_amount_inr === myOffer.price_inr, `${order.original_amount_inr} vs ${myOffer.price_inr}`);
check('wallet applied', order.wallet_used_inr === 2000, String(order.wallet_used_inr));
check('final amount = price - wallet', order.final_amount_inr === myOffer.price_inr - 2000);

const strangerPay = await stranger.call('/payments/order', { method: 'POST', body: JSON.stringify({ offer_id: myOffer.id }) });
check('payment requires auth', strangerPay.status === 401, `got ${strangerPay.status}`);

const verify = await buyer.call('/payments/verify', {
  method: 'POST',
  body: JSON.stringify({ razorpay_order_id: order.order_id, razorpay_payment_id: 'pay_test_1', razorpay_signature: 'bogus' }),
});
if (health.payments_test_mode) {
  check('test-mode payment settles', verify.status === 'paid', JSON.stringify(verify).slice(0, 120));
  console.log('    \x1b[33m(PAYMENTS_TEST_MODE=true — signature check bypassed for local testing)\x1b[0m');
} else if (order.mocked) {
  check('mock payment settles', verify.status === 'paid', JSON.stringify(verify).slice(0, 120));
} else {
  check('forged signature rejected on a live order', verify.ok !== true, JSON.stringify(verify).slice(0, 120));
  console.log('    \x1b[33m(Razorpay keys are configured, so the mock path is correctly disabled)\x1b[0m');
}

// --- order lifecycle -------------------------------------------------------
section('Order & delivery');
if (verify.status === 'paid') {
  const accepted = await buyer.call(`/offers/${myOffer.id}/accept`, { method: 'POST' });
  check('offer accepted after payment', accepted.ok === true, accepted.error);
  check('order created', !!accepted.order?.id, JSON.stringify(accepted).slice(0, 120));
  check('order starts at "confirmed", not delivered', accepted.order?.stage === 'confirmed', accepted.order?.stage);

  const track = await buyer.call(`/delivery/${myOffer.id}`);
  check('delivery tracking works', !!track.delivery, track.error);
  check('tracking id issued', !!track.delivery?.tracking_id);
  check('not delivered yet', track.delivery?.delivered === false, String(track.delivery?.delivered));

  const strangerTrack = await stranger.call(`/delivery/${myOffer.id}`);
  check('tracking is private', strangerTrack.status === 401 || strangerTrack.status === 403, `got ${strangerTrack.status}`);

  const stage = await supplier.call(`/orders/${accepted.order.id}/stage`, { method: 'POST', body: JSON.stringify({ stage: 'shipped' }) });
  check('supplier can advance the order', stage.ok === true && stage.stage === 'shipped', JSON.stringify(stage).slice(0, 100));

  section('Review');
  const review = await buyer.call('/reviews', { method: 'POST', body: JSON.stringify({ offer_id: myOffer.id, rating: 5, comment: 'Fast delivery, great price.' }) });
  check('buyer can review their order', !!review.review?.id, review.error);
  const dupe = await buyer.call('/reviews', { method: 'POST', body: JSON.stringify({ offer_id: myOffer.id, rating: 1 }) });
  check('duplicate review blocked', dupe.status === 409, `got ${dupe.status}`);
  const strangerReview = await stranger.call('/reviews', { method: 'POST', body: JSON.stringify({ offer_id: myOffer.id, rating: 1 }) });
  check('review requires auth', strangerReview.status === 401, `got ${strangerReview.status}`);

  section('Wallet & loyalty');
  const wallet = await buyer.call('/wallet');
  check('wallet reflects cashback', wallet.wallet?.transactions?.some((t) => t.type === 'credit'), JSON.stringify(wallet.wallet?.transactions || []).slice(0, 140));
  const me = await buyer.call('/me');
  check('spend recorded', (me.user?.total_spent_inr || 0) > 0, String(me.user?.total_spent_inr));
  check('orders listed on profile', (me.orders || []).length > 0);
} else {
  console.log('    \x1b[33mSkipping order/review checks — payment did not settle in this configuration.\x1b[0m');
}

// --- chat ------------------------------------------------------------------
section('Chat');
const sent = await buyer.call('/messages', { method: 'POST', body: JSON.stringify({ offer_id: bid.offer.id, text: 'Is this in stock today?' }) });
check('buyer can message', !!sent.message?.id, sent.error);
const reply = await supplier.call('/messages', { method: 'POST', body: JSON.stringify({ offer_id: bid.offer.id, text: 'Yes, ready to dispatch.' }) });
check('supplier can reply', !!reply.message?.id, reply.error);
check('sender identified from session', reply.message?.sender === 'supplier', reply.message?.sender);
const thread = await buyer.call(`/messages/${bid.offer.id}`);
check('thread has both messages', (thread.messages || []).length >= 2, String(thread.messages?.length));
const strangerThread = await stranger.call(`/messages/${bid.offer.id}`);
check('chat is private', strangerThread.status === 401 || strangerThread.status === 403, `got ${strangerThread.status}`);

// --- notifications ---------------------------------------------------------
section('Notifications');
const notifications = await buyer.call('/notifications');
check('buyer has notifications', (notifications.notifications || []).length > 0, String(notifications.notifications?.length));
check('unread count present', typeof notifications.unread === 'number');
const supplierNotifications = await supplier.call('/notifications');
check('supplier was alerted to the request', (supplierNotifications.notifications || []).some((n) => n.type === 'new_request'));

// --- supplier analytics ----------------------------------------------------
section('Supplier analytics');
const analytics = await supplier.call('/analytics/supplier');
check('analytics load', !!analytics.stats, analytics.error);
check('offers counted', analytics.stats?.offers_submitted > 0, String(analytics.stats?.offers_submitted));

section('Auto-bid rules');
const rule = await supplier.call('/supplier/rules', { method: 'POST', body: JSON.stringify({ name: 'Apple smartphones', brand: 'Apple', sub_category: 'smartphone', discount_pct: 6 }) });
check('rule created', !!rule.rule?.id, rule.error);
const rules = await supplier.call('/supplier/rules');
check('rules listed', (rules.rules || []).length > 0);
const toggled = await supplier.call(`/supplier/rules/${rule.rule.id}/toggle`, { method: 'POST' });
check('rule toggled', toggled.ok === true && toggled.enabled === false, JSON.stringify(toggled));
const strangerRule = await stranger.call('/supplier/rules');
check('rules require supplier auth', strangerRule.status === 401, `got ${strangerRule.status}`);
await supplier.call(`/supplier/rules/${rule.rule.id}`, { method: 'DELETE' });

// --- storefront ------------------------------------------------------------
section('Public storefront');
const store = await stranger.call('/store/supplier@test.in');
check('storefront is public', !!store.supplier, store.error);
check('GST not exposed publicly', store.supplier?.gst === undefined);

// --- catalogue, own offers, single request ---------------------------------
section('Lookups the apps depend on');
const types = await stranger.call('/suppliers/types');
check('business types are public', Array.isArray(types.supplier_types) && types.supplier_types.length > 0, JSON.stringify(types).slice(0, 100));

const supplierMe = await supplier.call('/suppliers/me');
check('supplier can read its own profile', supplierMe.supplier?.email === 'supplier@test.in', JSON.stringify(supplierMe).slice(0, 100));
const strangerSupplierMe = await stranger.call('/suppliers/me');
check('own profile requires supplier auth', strangerSupplierMe.status === 401, `got ${strangerSupplierMe.status}`);

const ownOffers = await supplier.call('/offers/mine');
check('supplier can list its own offers', Array.isArray(ownOffers.offers) && ownOffers.offers.length > 0, JSON.stringify(ownOffers).slice(0, 100));
check('own offers carry the request context', !!ownOffers.offers?.[0]?.request_id || !!ownOffers.offers?.[0]?.request, JSON.stringify(ownOffers.offers?.[0] || {}).slice(0, 120));

const oneRequest = await buyer.call(`/requests/${created.request.id}`);
check('buyer can reopen a past request', oneRequest.request?.id === created.request.id, oneRequest.error);
const strangerRequest = await stranger.call(`/requests/${created.request.id}`);
check('another buyer cannot read it', strangerRequest.status === 401 || strangerRequest.status === 403, `got ${strangerRequest.status}`);

// --- group buying ----------------------------------------------------------
section('Group buying');
const suggestion = await buyer.call(`/requests/${created.request.id}/group-suggestion`);
check('group suggestion computed', typeof suggestion.similar_count === 'number' && !!suggestion.product_key, JSON.stringify(suggestion).slice(0, 120));

const group = await buyer.call('/groups', { method: 'POST', body: JSON.stringify({ request_id: created.request.id }) });
check('group created or matched', !!group.group?.id, group.error);
check('creator is a member', (group.group?.members || []).some((m) => m.email === 'buyer@test.in'), JSON.stringify(group.group?.members || []).slice(0, 120));

const rejoin = await buyer.call(`/groups/${group.group.id}/join`, { method: 'POST' });
check('joining twice is refused', rejoin.status === 409, `got ${rejoin.status}`);
const anonJoin = await stranger.call(`/groups/${group.group.id}/join`, { method: 'POST' });
check('joining requires sign-in', anonJoin.status === 401, `got ${anonJoin.status}`);

// --- reviews, read back ----------------------------------------------------
section('Reviews (read)');
const offerReview = await stranger.call(`/reviews/offer/${myOffer.id}`);
check('an offer\'s review is readable', offerReview.ok === true, offerReview.error);
const supplierReviews = await stranger.call(`/reviews/supplier/${bid.offer.supplier_id}`);
check('supplier reviews are public', Array.isArray(supplierReviews.reviews), JSON.stringify(supplierReviews).slice(0, 100));
check('reviewer email is never exposed', !(supplierReviews.reviews || []).some((r) => 'buyer_email' in r), 'buyer_email leaked');

// --- push registration -----------------------------------------------------
section('Push registration');
const push = await buyer.call('/push/register', { method: 'POST', body: JSON.stringify({ expo_token: 'ExponentPushToken[smoke-test]' }) });
check('push token accepted', push.ok === true, push.error);
const anonPush = await stranger.call('/push/register', { method: 'POST', body: JSON.stringify({ expo_token: 'ExponentPushToken[nope]' }) });
check('push registration requires sign-in', anonPush.status === 401, `got ${anonPush.status}`);

// --- supplier KYC ----------------------------------------------------------
section('Supplier KYC');
{
  // Build a structurally valid GSTIN with a correct check digit, unique per
  // run, so repeated runs do not collide on the one-GSTIN-per-account rule.
  const CS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function makeGstin() {
    const letters = () => Array.from({ length: 5 }, () => CS[10 + Math.floor(Math.random() * 26)]).join('');
    const digits = () => Array.from({ length: 4 }, () => CS[Math.floor(Math.random() * 10)]).join('');
    const prefix = `29${letters()}${digits()}${CS[10 + Math.floor(Math.random() * 26)]}1Z`;
    let total = 0;
    for (let i = 0; i < 14; i++) {
      const product = CS.indexOf(prefix[i]) * (i % 2 === 0 ? 1 : 2);
      total += Math.floor(product / 36) + (product % 36);
    }
    return prefix + CS[(36 - (total % 36)) % 36];
  }
  const gstin = makeGstin();
  const tamperedGstin = gstin.slice(0, 14) + CS[(CS.indexOf(gstin[14]) + 1) % 36];
  const kyc = makeClient('kyc');
  const address = `kyc+${Date.now()}@bolibazzar.test`;
  const ask = await kyc.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: address, role: 'supplier' }) });
  await kyc.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: address, code: ask.dev_code, role: 'supplier', business_name: 'KYC Test Co' }) });

  const junk = await kyc.call('/suppliers', {
    method: 'POST',
    body: JSON.stringify({ business_name: 'X', gst: 'NOPE', contact_name: '', address: 'short', city: '', pincode: '1', supplier_type: 'nope' }),
  });
  check('incomplete registration rejected', junk.status === 422, `got ${junk.status}`);
  check('errors are reported per field', !!junk.fields?.gst && !!junk.fields?.pincode, JSON.stringify(junk.fields || {}).slice(0, 90));

  const base = {
    business_name: 'KYC Test Co', contact_name: 'Test Contact', phone: '9876543210',
    address: '14 Residency Road, Ashok Nagar', city: 'Bengaluru', pincode: '560025',
    supplier_type: 'retail_store',
  };

  // 29AAGCB7383J1Z4 carries a correct check digit; ...1ZZ does not.
  const tampered = await kyc.call('/suppliers', { method: 'POST', body: JSON.stringify({ ...base, gst: tamperedGstin }) });
  check('GSTIN check digit is enforced', tampered.status === 422 && /check digit/i.test(tampered.fields?.gst || ''), tampered.fields?.gst);

  const badState = await kyc.call('/suppliers', { method: 'POST', body: JSON.stringify({ ...base, gst: '88' + gstin.slice(2) }) });
  check('invalid state code rejected', badState.status === 422 && /state code/i.test(badState.fields?.gst || ''), badState.fields?.gst);

  const good = await kyc.call('/suppliers', { method: 'POST', body: JSON.stringify({ ...base, gst: gstin }) });
  check('valid registration accepted', good.ok === true, good.error || JSON.stringify(good.fields || {}));
  check('PAN extracted from the GSTIN', good.supplier?.pan === gstin.slice(2, 12), good.supplier?.pan);
  check('marked complete but not yet approved', good.supplier?.profile_complete === true && good.supplier?.status === 'pending_review', good.supplier?.status);
  check('GSTIN not claimed as verified', good.supplier?.gst_verified === false, String(good.supplier?.gst_verified));

  // A different account must not be able to claim the same GSTIN.
  const other = makeClient('kyc2');
  const a2 = await other.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: `dupe+${Date.now()}@bolibazzar.test`, role: 'supplier' }) });
  const e2 = a2.destination;
  await other.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: e2, code: a2.dev_code, role: 'supplier', business_name: 'Dupe Co' }) });
  const dupe = await other.call('/suppliers', { method: 'POST', body: JSON.stringify({ ...base, business_name: 'Dupe Co', gst: gstin }) });
  check('a GSTIN cannot be registered twice', dupe.status === 409, `got ${dupe.status}`);
}

// --- real email delivery ---------------------------------------------------
// When a local mail sink is present (the UAT stack runs Mailpit), prove the
// production email path end to end: a real message is sent, and the code
// inside it actually signs a user in. Skipped when no sink is reachable.
section('Email delivery');
const MAIL_UI = process.env.MAIL_UI || 'http://localhost:8025';
let mailUp = false;
try {
  mailUp = (await fetch(`${MAIL_UI}/api/v1/messages?limit=1`, { signal: AbortSignal.timeout(3000) })).ok;
} catch { mailUp = false; }

if (!mailUp) {
  console.log('    (no local mail sink at ' + MAIL_UI + ' — skipping)');
} else {
  const address = `smoke+${Date.now()}@bolibazzar.test`;
  const mailer = makeClient('mailtest');
  const asked = await mailer.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: address }) });
  check('login code accepted for delivery', asked.ok === true, asked.error);
  check('a message was actually sent', !!asked.delivery?.messageId, JSON.stringify(asked.delivery || {}).slice(0, 100));

  await sleep(1500);
  const inbox = await (await fetch(`${MAIL_UI}/api/v1/search?query=${encodeURIComponent(address)}`)).json();
  const message = inbox.messages?.[0];
  check('email arrived in the inbox', !!message, `found ${inbox.messages?.length ?? 0}`);

  if (message) {
    check('subject carries the code', /\d{6} is your BoliBazzar login code/.test(message.Subject), message.Subject);
    const full = await (await fetch(`${MAIL_UI}/api/v1/message/${message.ID}`)).json();
    const emailed = (full.Text || full.HTML || '').match(/\b(\d{6})\b/)?.[1];
    check('a 6-digit code is in the body', !!emailed, String(emailed));

    const loggedIn = await mailer.call('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email: address, code: emailed, name: 'Smoke Mail' }),
    });
    check('the emailed code signs the user in', loggedIn.ok === true && loggedIn.user?.email === address, loggedIn.error);
  }
}

// --- mobile bearer auth ----------------------------------------------------
// Native apps have no cookie jar; they send the session token as a header.
section('Mobile bearer auth');
async function bearerCall(path, token, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  return { status: response.status, ok: response.ok, ...(await response.json().catch(() => ({}))) };
}
// A dedicated address: reusing a shared one trips the per-destination OTP
// throttle when the suite is run repeatedly.
const mobileEmail = `mobile+${Date.now()}@bolibazzar.test`;
const mobileOtp = await stranger.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: mobileEmail }) });
check('login code issued for the mobile actor', !!mobileOtp.dev_code, mobileOtp.error || `status ${mobileOtp.status}`);
const mobileLogin = await stranger.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: mobileEmail, code: mobileOtp.dev_code, name: 'Mobile Tester' }) });
check('login returns a bearer token', typeof mobileLogin.token === 'string' && mobileLogin.token.length > 20, mobileLogin.error);

// Everything below needs a token; bail out cleanly rather than crashing.
if (typeof mobileLogin.token === 'string') {
const bearerMe = await bearerCall('/me', mobileLogin.token);
check('bearer token authenticates', bearerMe.user?.email === mobileEmail, `status ${bearerMe.status}`);
const bearerOrders = await bearerCall('/orders', mobileLogin.token);
check('bearer can read orders', Array.isArray(bearerOrders.orders), `status ${bearerOrders.status}`);
const badBearer = await bearerCall('/me', mobileLogin.token.slice(0, -4) + 'aaaa');
check('tampered token rejected', badBearer.status === 401, `got ${badBearer.status}`);
// A buyer token must never satisfy a supplier-only route.
const crossRole = await bearerCall('/supplier/rules', mobileLogin.token);
check('buyer token cannot act as supplier', crossRole.status === 401, `got ${crossRole.status}`);

// The mobile notification feed and chat screens run entirely on bearer auth.
const bearerFeed = await bearerCall('/notifications', mobileLogin.token);
check('bearer can read the notification feed', Array.isArray(bearerFeed.notifications) && typeof bearerFeed.unread === 'number', `status ${bearerFeed.status}`);
const bearerRead = await bearerCall('/notifications/read', mobileLogin.token, { method: 'POST', body: JSON.stringify({ ids: [] }) });
check('bearer can mark notifications read', bearerRead.ok, `status ${bearerRead.status}`);

// A signed-in outsider is still not a party to someone else's offer, whether
// they arrive by cookie or by bearer token.
const outsiderChat = await bearerCall(`/messages/${bid.offer.id}`, mobileLogin.token);
check('a bearer outsider cannot read a thread', outsiderChat.status === 403, `got ${outsiderChat.status}`);
}

// Chat over a bearer token, for the buyer who actually owns the offer. The
// mobile chat screen runs entirely on this path.
if (typeof login.token === 'string') {
const bearerChat = await bearerCall('/messages', login.token, {
  method: 'POST',
  body: JSON.stringify({ offer_id: bid.offer.id, text: 'Sent from the mobile app.' }),
});
check('bearer can post to its own chat thread', bearerChat.ok && bearerChat.message?.sender === 'buyer', bearerChat.error || `status ${bearerChat.status}`);
const bearerThread = await bearerCall(`/messages/${bid.offer.id}`, login.token);
check('bearer can read the thread back', (bearerThread.messages || []).some((m) => m.text === 'Sent from the mobile app.'), `status ${bearerThread.status}`);
// The chat screen only asks for what it has not seen; a future cursor must
// come back empty rather than replaying the thread.
const bearerSince = await bearerCall(`/messages/${bid.offer.id}?since=${encodeURIComponent(new Date(Date.now() + 60000).toISOString())}`, login.token);
check('since= returns only newer messages', (bearerSince.messages || []).length === 0, String(bearerSince.messages?.length));
}

// --- admin -----------------------------------------------------------------
section('Admin');
const admin = makeClient('admin');
const badAdmin = await admin.call('/admin/session', { method: 'POST', body: JSON.stringify({ email: 'admin@bolibazzar.in', access_key: 'wrong' }) });
check('bad admin key rejected', badAdmin.status === 403, `got ${badAdmin.status}`);
const noAdmin = await stranger.call('/admin/overview');
check('admin routes guarded', noAdmin.status === 401, `got ${noAdmin.status}`);

// The guards above were the only admin coverage; the console itself was never
// exercised. Sign in properly and walk it.
const adminKey = process.env.ADMIN_ACCESS_KEY;
const adminEmail = (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
if (!adminKey || !adminEmail) {
  console.log('    \x1b[33mSkipping admin console checks — set ADMIN_ACCESS_KEY and ADMIN_EMAILS to run them.\x1b[0m');
} else {
  const login = await admin.call('/admin/session', { method: 'POST', body: JSON.stringify({ email: adminEmail, access_key: adminKey }) });
  check('admin can sign in', login.ok === true, login.error);

  const session = await admin.call('/admin/session');
  check('admin session persists', session.email === adminEmail.toLowerCase(), JSON.stringify(session).slice(0, 100));

  const overview = await admin.call('/admin/overview');
  check('overview loads', overview.ok === true, overview.error);
  check('overview counts real data', JSON.stringify(overview).includes('suppliers') || !!overview.stats, JSON.stringify(overview).slice(0, 140));

  // Every type the console can browse, plus the settings view.
  for (const type of ['customers', 'suppliers', 'requests', 'offers', 'orders', 'reviews', 'messages', 'payments', 'settings']) {
    const records = await admin.call(`/admin/records?type=${type}&limit=5`);
    check(`records: ${type}`, records.ok === true && Array.isArray(records.records), records.error || `status ${records.status}`);
  }

  const searched = await admin.call('/admin/records?type=suppliers&search=test');
  check('records can be searched', searched.ok === true && Array.isArray(searched.records), searched.error);
  // A regex metacharacter in the search box must not blow up or hang the query.
  const nastySearch = await admin.call('/admin/records?type=suppliers&search=' + encodeURIComponent('a(('));
  check('a malformed search is handled safely', nastySearch.ok === true, nastySearch.error || `status ${nastySearch.status}`);

  const badType = await admin.call('/admin/records?type=platform_settings');
  check('an unlisted record type is refused', badType.status >= 400, `got ${badType.status}`);

  // Settings are a closed registry now, so anything not in it is refused —
  // including the arbitrary keys the console used to accept.
  const setting = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'support_email', value: 'help@bolibazzar.in' }) });
  check('a platform setting can be written', setting.ok === true, setting.error);
  await admin.call('/admin/settings/support_email', { method: 'DELETE' });
  const reserved = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'razorpay_secret', value: 'x' }) });
  check('reserved setting keys are refused', reserved.status >= 400, `got ${reserved.status}`);
  const badKey = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'Bad Key!', value: 1 }) });
  check('malformed setting keys are refused', badKey.status >= 400, `got ${badKey.status}`);
  const arbitrary = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'smoke_test_flag', value: true }) });
  check('arbitrary keys are no longer accepted', arbitrary.status === 400, `got ${arbitrary.status}`);

  // Every admin action above should have left a trail.
  const audit = await admin.call('/admin/audit');
  check('audit log loads', Array.isArray(audit.entries) || Array.isArray(audit.audit), JSON.stringify(audit).slice(0, 120));
  const trail = JSON.stringify(audit);
  check('the failed login was recorded', trail.includes('login_failed'), '');
  check('the setting change was recorded', trail.includes('update_platform_setting'), '');

  // --- moderation ----------------------------------------------------------
  // These are the console's action buttons. Nothing exercised them before, so
  // a broken moderation path would have shipped silently.
  section('Admin moderation');

  const suspend = await admin.call('/admin/customers/buyer%40test.in/status', { method: 'PATCH', body: JSON.stringify({ status: 'suspended', reason: 'smoke test' }) });
  check('a customer can be suspended', suspend.ok === true && suspend.status === 'suspended', suspend.error);
  const restore = await admin.call('/admin/customers/buyer%40test.in/status', { method: 'PATCH', body: JSON.stringify({ status: 'active', reason: 'smoke test done' }) });
  check('and restored', restore.ok === true && restore.status === 'active', restore.error);
  const badStatus = await admin.call('/admin/customers/buyer%40test.in/status', { method: 'PATCH', body: JSON.stringify({ status: 'banished' }) });
  check('an invalid customer status is refused', badStatus.status >= 400, `got ${badStatus.status}`);
  const ghost = await admin.call('/admin/customers/nobody%40nowhere.test/status', { method: 'PATCH', body: JSON.stringify({ status: 'suspended' }) });
  check('an unknown customer is a 404', ghost.status === 404, `got ${ghost.status}`);

  const walletBefore = await buyer.call('/wallet');
  const credit = await admin.call('/admin/customers/buyer%40test.in/wallet', { method: 'PATCH', body: JSON.stringify({ amount_inr: 500, reason: 'goodwill' }) });
  check('wallet can be credited', credit.ok === true, credit.error);
  check('the credit lands on the balance', credit.balance_inr === (walletBefore.wallet?.balance_inr || 0) + 500, `${walletBefore.wallet?.balance_inr} -> ${credit.balance_inr}`);
  const debit = await admin.call('/admin/customers/buyer%40test.in/wallet', { method: 'PATCH', body: JSON.stringify({ amount_inr: -500, reason: 'reversing' }) });
  check('and debited back', debit.ok === true && debit.balance_inr === walletBefore.wallet?.balance_inr, `${debit.balance_inr}`);
  const zero = await admin.call('/admin/customers/buyer%40test.in/wallet', { method: 'PATCH', body: JSON.stringify({ amount_inr: 0 }) });
  check('a zero adjustment is refused', zero.status >= 400, `got ${zero.status}`);
  const overdraw = await admin.call('/admin/customers/buyer%40test.in/wallet', { method: 'PATCH', body: JSON.stringify({ amount_inr: -99999999 }) });
  check('a wallet cannot be driven negative', overdraw.status >= 400, `got ${overdraw.status}`);

  const supplierStatus = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', reason: 'smoke test' }) });
  check('supplier status can be set', supplierStatus.ok === true, supplierStatus.error);
  const badSupplierStatus = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'vibes' }) });
  check('an invalid supplier status is refused', badSupplierStatus.status >= 400, `got ${badSupplierStatus.status}`);

  const escalate = await admin.call(`/admin/requests/${created.request.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'escalated', note: 'smoke test' }) });
  check('a request can be escalated', escalate.ok === true && escalate.status === 'escalated', escalate.error);
  const badRequestStatus = await admin.call(`/admin/requests/${created.request.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'nonsense' }) });
  check('an invalid request status is refused', badRequestStatus.status >= 400, `got ${badRequestStatus.status}`);

  const moderateOffer = await admin.call(`/admin/offers/${bid.offer.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'pending', reason: 'smoke test' }) });
  check('an offer can be moderated', moderateOffer.ok === true, moderateOffer.error);
  const badOfferStatus = await admin.call(`/admin/offers/${bid.offer.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'maybe' }) });
  check('an invalid offer status is refused', badOfferStatus.status >= 400, `got ${badOfferStatus.status}`);

  // Hiding a review must actually remove it from the public storefront.
  const reviewsBefore = await stranger.call(`/reviews/supplier/${bid.offer.supplier_id}`);
  const someReview = (reviewsBefore.reviews || [])[0];
  if (someReview) {
    const hide = await admin.call(`/admin/reviews/${someReview.id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'hidden', reason: 'smoke test' }) });
    check('a review can be hidden', hide.ok === true, hide.error);
    const reviewsAfter = await stranger.call(`/reviews/supplier/${bid.offer.supplier_id}`);
    check('a hidden review disappears from the storefront', !(reviewsAfter.reviews || []).some((r) => r.id === someReview.id), '');
    const show = await admin.call(`/admin/reviews/${someReview.id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'visible' }) });
    check('and can be restored', show.ok === true, show.error);
    const badVisibility = await admin.call(`/admin/reviews/${someReview.id}/visibility`, { method: 'PATCH', body: JSON.stringify({ visibility: 'sort-of' }) });
    check('an invalid visibility is refused', badVisibility.status >= 400, `got ${badVisibility.status}`);
  }

  const payments = await admin.call('/admin/records?type=payments&limit=1');
  const somePayment = (payments.records || [])[0];
  if (somePayment) {
    const reviewed = await admin.call(`/admin/payments/${somePayment.id}/review`, { method: 'PATCH', body: JSON.stringify({ review_status: 'reconciled', note: 'smoke test' }) });
    check('a payment can be marked reconciled', reviewed.ok === true, reviewed.error);
    const badReview = await admin.call(`/admin/payments/${somePayment.id}/review`, { method: 'PATCH', body: JSON.stringify({ review_status: 'whatever' }) });
    check('an invalid payment review status is refused', badReview.status >= 400, `got ${badReview.status}`);
  }

  // Suspension must cut off a session that already exists. Sessions are
  // stateless signed tokens, so an account-status check at login alone left a
  // suspended user free to keep buying until their token expired.
  const victim = makeClient('suspended');
  const victimEmail = `suspended+${Date.now()}@bolibazzar.test`;
  const victimOtp = await victim.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: victimEmail }) });
  const victimLogin = await victim.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: victimEmail, code: victimOtp.dev_code, name: 'Suspended Tester' }) });
  check('the test account signs in first', victimLogin.ok === true, victimLogin.error);

  const beforeSuspend = await victim.call('/me');
  check('and can use the app', beforeSuspend.ok === true, `status ${beforeSuspend.status}`);

  await admin.call(`/admin/customers/${encodeURIComponent(victimEmail)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'suspended', reason: 'smoke test' }) });

  const afterSuspend = await victim.call('/me');
  check('suspension blocks the existing cookie session', afterSuspend.status === 403, `got ${afterSuspend.status}`);
  const stillPosting = await victim.call('/requests', { method: 'POST', body: JSON.stringify({ requirement: { product: 'test', budget_inr: 100 }, raw_text: 'test' }) });
  check('a suspended user cannot post a request', stillPosting.status === 403, `got ${stillPosting.status}`);
  const stillSpending = await victim.call('/wallet');
  check('a suspended user cannot reach their wallet', stillSpending.status === 403, `got ${stillSpending.status}`);

  if (typeof victimLogin.token === 'string') {
    const viaBearer = await bearerCall('/me', victimLogin.token);
    check('and the mobile bearer token is cut off too', viaBearer.status === 403, `got ${viaBearer.status}`);
  }

  const reLogin = await victim.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: victimEmail }) });
  const reVerify = await victim.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: victimEmail, code: reLogin.dev_code }) });
  check('and they cannot log back in', reVerify.status === 403, `got ${reVerify.status}`);

  await admin.call(`/admin/customers/${encodeURIComponent(victimEmail)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
  const restored = await victim.call('/me');
  check('restoring the account restores access', restored.ok === true, `status ${restored.status}`);

  // --- settings ------------------------------------------------------------
  // These used to be write-only: the console stored a key and listed it back
  // while nothing read it, so every "setting" was decorative. Each check below
  // asserts the platform actually behaves differently afterwards.
  section('Admin settings');

  const catalogue = await admin.call('/admin/settings');
  check('the settings catalogue loads', Array.isArray(catalogue.groups) && catalogue.groups.length >= 6, JSON.stringify(catalogue).slice(0, 120));
  const allSettings = (catalogue.groups || []).flatMap((g) => g.settings || []);
  check('every setting declares a type and default', allSettings.every((x) => x.type && 'default' in x), '');
  check('no secret is exposed as a setting', !allSettings.some((x) => /secret|password|key$/i.test(x.key)), '');

  const windowBefore = (await stranger.call('/health')).auction_window_seconds;
  const setWindow = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'auction_window_seconds', value: 63 }) });
  check('a setting can be written', setWindow.ok === true, setWindow.error);
  const windowAfter = (await stranger.call('/health')).auction_window_seconds;
  check('and it changes real behaviour', windowAfter === 63, `${windowBefore} -> ${windowAfter}`);

  const tooSmall = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'auction_window_seconds', value: 2 }) });
  check('out-of-range values are refused', tooSmall.status === 400 && !!tooSmall.errors, JSON.stringify(tooSmall).slice(0, 120));
  const unknown = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'not_a_setting', value: 1 }) });
  check('unknown settings are refused', unknown.status === 400, `got ${unknown.status}`);

  const batch = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ updates: [
    { key: 'cashback_silver_pct', value: 4 }, { key: 'tier_gold_min_inr', value: 40000 },
  ] }) });
  check('a batch of settings saves together', batch.ok === true && batch.updated?.length === 2, batch.error);
  const partial = await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ updates: [
    { key: 'cashback_gold_pct', value: 7 }, { key: 'cashback_platinum_pct', value: 900 },
  ] }) });
  check('a batch with one bad value saves none of it', partial.status === 400, `got ${partial.status}`);
  const goldAfter = (await admin.call('/admin/settings')).groups.flatMap((g) => g.settings).find((x) => x.key === 'cashback_gold_pct');
  check('the good half of a rejected batch was not applied', goldAfter?.value !== 7, String(goldAfter?.value));

  const reset = await admin.call('/admin/settings/auction_window_seconds', { method: 'DELETE' });
  check('a setting can be reset to its default', reset.ok === true, reset.error);
  check('the default is live again', (await stranger.call('/health')).auction_window_seconds === windowBefore, '');
  await admin.call('/admin/settings/cashback_silver_pct', { method: 'DELETE' });
  await admin.call('/admin/settings/tier_gold_min_inr', { method: 'DELETE' });

  // Availability switches genuinely close the doors they name.
  await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'chat_enabled', value: false }) });
  const chatOff = await buyer.call('/messages', { method: 'POST', body: JSON.stringify({ offer_id: bid.offer.id, text: 'hello' }) });
  check('turning chat off blocks messages', chatOff.status === 503, `got ${chatOff.status}`);
  await admin.call('/admin/settings/chat_enabled', { method: 'DELETE' });
  const chatBack = await buyer.call('/messages', { method: 'POST', body: JSON.stringify({ offer_id: bid.offer.id, text: 'hello again' }) });
  check('and turning it back on restores them', chatBack.ok === true, chatBack.error);

  await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'ordering_enabled', value: false }) });
  const orderOff = await buyer.call('/payments/order', { method: 'POST', body: JSON.stringify({ offer_id: bid.offer.id }) });
  check('turning ordering off blocks checkout', orderOff.status === 503, `got ${orderOff.status}`);
  await admin.call('/admin/settings/ordering_enabled', { method: 'DELETE' });

  // Maintenance mode must not lock the operator out of the switch.
  await admin.call('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key: 'maintenance_mode', value: true }) });
  const duringMaintenance = await buyer.call('/me');
  check('maintenance mode closes the app', duringMaintenance.status === 503, `got ${duringMaintenance.status}`);
  const healthDuring = await stranger.call('/health');
  check('health stays up during maintenance', healthDuring.status === 'ok', JSON.stringify(healthDuring).slice(0, 80));
  const adminDuring = await admin.call('/admin/overview');
  check('admin stays reachable during maintenance', adminDuring.ok === true, `got ${adminDuring.status}`);
  await admin.call('/admin/settings/maintenance_mode', { method: 'DELETE' });
  check('and the app reopens afterwards', (await buyer.call('/me')).ok === true, '');

  // --- profile editing -----------------------------------------------------
  section('Admin profile editing');

  const customerDetail = await admin.call('/admin/customers/buyer%40test.in');
  check('a customer record loads in full', customerDetail.customer?.email === 'buyer@test.in' && Array.isArray(customerDetail.orders), JSON.stringify(customerDetail).slice(0, 100));
  check('their wallet comes with it', 'wallet' in customerDetail, '');

  const editCustomer = await admin.call('/admin/customers/buyer%40test.in', { method: 'PATCH', body: JSON.stringify({ name: 'Priya Sharma', notes: 'VIP' }) });
  check('a customer profile can be edited', editCustomer.ok === true && editCustomer.customer?.name === 'Priya Sharma', editCustomer.error);
  const spendEdit = await admin.call('/admin/customers/buyer%40test.in', { method: 'PATCH', body: JSON.stringify({ total_spent_inr: 250000 }) });
  check('editing spend recomputes the loyalty tier', spendEdit.customer?.tier === 'platinum', String(spendEdit.customer?.tier));
  const missingCustomer = await admin.call('/admin/customers/ghost%40nowhere.test', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) });
  check('editing an unknown customer is a 404', missingCustomer.status === 404, `got ${missingCustomer.status}`);

  const supplierDetail = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`);
  check('a seller record loads in full', !!supplierDetail.supplier?.business_name && Array.isArray(supplierDetail.offers), JSON.stringify(supplierDetail).slice(0, 100));

  const editSupplier = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`, { method: 'PATCH', body: JSON.stringify({ city: 'Pune', brand_authorisations: ['Apple', 'Samsung'] }) });
  check('a seller profile can be edited', editSupplier.ok === true && editSupplier.supplier?.city === 'Pune', editSupplier.error);
  check('list fields are stored as lists', Array.isArray(editSupplier.supplier?.brand_authorisations), '');
  const badBusinessType = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`, { method: 'PATCH', body: JSON.stringify({ supplier_type: 'not_a_type' }) });
  check('an invalid business type is refused', badBusinessType.status === 400, `got ${badBusinessType.status}`);

  // --- KYC -----------------------------------------------------------------
  section('Admin KYC verification');

  const verify = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`, { method: 'PATCH', body: JSON.stringify({ gst_verified: true, address_verified: true, kyc_note: 'Checked on the GST portal' }) });
  check('checks can be recorded', verify.ok === true && verify.supplier?.gst_verified === true, verify.error);
  check('a verification is stamped with who and when', !!verify.supplier?.gst_verified_by && !!verify.supplier?.gst_verified_at, '');

  const kycView = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`);
  check('the KYC view lists every check', ['gst_verified', 'address_verified', 'phone_verified', 'bank_verified'].every((c) => c in (kycView.checks || {})), '');
  check('the history records the decision', (kycView.history || []).length > 0, String(kycView.history?.length));
  check('the GSTIN format is checked independently', kycView.gst_format_valid !== undefined, '');

  const revoke = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`, { method: 'PATCH', body: JSON.stringify({ gst_verified: false, kyc_note: 'Certificate expired' }) });
  check('a verification can be revoked', revoke.ok === true && revoke.supplier?.gst_verified === false, revoke.error);
  const historyAfter = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`);
  check('revoking is recorded too', (historyAfter.history || []).length >= 2, String(historyAfter.history?.length));
  const badCheck = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`, { method: 'PATCH', body: JSON.stringify({ gst_verified: 'maybe' }) });
  check('a non-boolean check is refused', badCheck.status === 400, `got ${badCheck.status}`);

  // Changing the GSTIN must drop a verification that referred to the old one.
  await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`, { method: 'PATCH', body: JSON.stringify({ gst_verified: true }) });
  const currentGst = (await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`)).supplier?.gst;
  const differentGst = currentGst === '27AAECT1234A1Z5' ? '29AAECT1234A1ZM' : '27AAECT1234A1Z5';
  const changedGst = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`, { method: 'PATCH', body: JSON.stringify({ gst: differentGst }) });
  check('changing the GSTIN clears its verification', changedGst.supplier?.gst_verified === false, `${currentGst} -> ${differentGst}, verified=${changedGst.supplier?.gst_verified}`);

  // Re-saving the same number is not a change, so a verification survives it.
  await admin.call(`/admin/suppliers/${bid.offer.supplier_id}/kyc`, { method: 'PATCH', body: JSON.stringify({ gst_verified: true }) });
  const sameGst = await admin.call(`/admin/suppliers/${bid.offer.supplier_id}`, { method: 'PATCH', body: JSON.stringify({ gst: differentGst }) });
  check('re-saving the same GSTIN keeps it verified', sameGst.supplier?.gst_verified === true, String(sameGst.supplier?.gst_verified));

  // --- broadcast -----------------------------------------------------------
  section('Admin broadcast');
  const broadcast = await admin.call('/admin/broadcast', { method: 'POST', body: JSON.stringify({ audience: 'buyers', title: 'Scheduled maintenance', body: 'We will be briefly offline on Sunday.' }) });
  check('an announcement sends', broadcast.ok === true && broadcast.sent > 0, broadcast.error);
  const buyerFeed = await buyer.call('/notifications');
  check('it lands in the notification feed', (buyerFeed.notifications || []).some((n) => n.type === 'announcement'), '');
  const badAudience = await admin.call('/admin/broadcast', { method: 'POST', body: JSON.stringify({ audience: 'nobody', title: 'x', body: 'y' }) });
  check('an unknown audience is refused', badAudience.status === 400, `got ${badAudience.status}`);
  const emptyBroadcast = await admin.call('/admin/broadcast', { method: 'POST', body: JSON.stringify({ audience: 'buyers', title: '', body: '' }) });
  check('an empty announcement is refused', emptyBroadcast.status === 400, `got ${emptyBroadcast.status}`);

  // --- orders --------------------------------------------------------------
  const anyOrder = (await admin.call('/admin/records?type=orders&limit=1')).records?.[0];
  if (anyOrder) {
    section('Admin order control');
    const moved = await admin.call(`/admin/orders/${anyOrder.id}`, { method: 'PATCH', body: JSON.stringify({ stage: 'shipped', note: 'manually advanced' }) });
    check('an order stage can be corrected', moved.ok === true && moved.order?.stage === 'shipped', moved.error);
    const badStage = await admin.call(`/admin/orders/${anyOrder.id}`, { method: 'PATCH', body: JSON.stringify({ stage: 'teleported' }) });
    check('an invalid stage is refused', badStage.status === 400, `got ${badStage.status}`);
  }

  // Moderation must never be reachable without an admin session.
  const sneaky = await stranger.call('/admin/customers/buyer%40test.in/wallet', { method: 'PATCH', body: JSON.stringify({ amount_inr: 100000 }) });
  check('moderation rejects a non-admin', sneaky.status === 401 || sneaky.status === 403, `got ${sneaky.status}`);
  const buyerSneaky = await buyer.call(`/admin/requests/${created.request.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
  check('a signed-in buyer is still not an admin', buyerSneaky.status === 401 || buyerSneaky.status === 403, `got ${buyerSneaky.status}`);

  await admin.call('/admin/session', { method: 'DELETE' });
  const afterLogout = await admin.call('/admin/overview');
  check('admin logout ends the session', afterLogout.status === 401, `got ${afterLogout.status}`);
}

// --- summary ---------------------------------------------------------------
console.log(`\n${'─'.repeat(56)}`);
console.log(`\x1b[1mPassed ${passed}  Failed ${failed}\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  • ' + f);
}
process.exit(failed ? 1 : 0);
