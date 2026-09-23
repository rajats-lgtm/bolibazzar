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
const mobileOtp = await stranger.call('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email: 'buyer@test.in' }) });
const mobileLogin = await stranger.call('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: 'buyer@test.in', code: mobileOtp.dev_code }) });
check('login returns a bearer token', typeof mobileLogin.token === 'string' && mobileLogin.token.length > 20);

const bearerMe = await bearerCall('/me', mobileLogin.token);
check('bearer token authenticates', bearerMe.user?.email === 'buyer@test.in', `status ${bearerMe.status}`);
const bearerOrders = await bearerCall('/orders', mobileLogin.token);
check('bearer can read orders', Array.isArray(bearerOrders.orders), `status ${bearerOrders.status}`);
const badBearer = await bearerCall('/me', mobileLogin.token.slice(0, -4) + 'aaaa');
check('tampered token rejected', badBearer.status === 401, `got ${badBearer.status}`);
// A buyer token must never satisfy a supplier-only route.
const crossRole = await bearerCall('/supplier/rules', mobileLogin.token);
check('buyer token cannot act as supplier', crossRole.status === 401, `got ${crossRole.status}`);

// --- admin -----------------------------------------------------------------
section('Admin');
const admin = makeClient('admin');
const badAdmin = await admin.call('/admin/session', { method: 'POST', body: JSON.stringify({ email: 'admin@bolibazzar.in', access_key: 'wrong' }) });
check('bad admin key rejected', badAdmin.status === 403, `got ${badAdmin.status}`);
const noAdmin = await stranger.call('/admin/overview');
check('admin routes guarded', noAdmin.status === 401, `got ${noAdmin.status}`);

// --- summary ---------------------------------------------------------------
console.log(`\n${'─'.repeat(56)}`);
console.log(`\x1b[1mPassed ${passed}  Failed ${failed}\x1b[0m`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  • ' + f);
}
process.exit(failed ? 1 : 0);
