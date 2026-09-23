import { v4 as uuidv4 } from 'uuid';
import { hasMailer, sendOtpEmail } from './mailer';

/**
 * Outbound notifications: in-app feed, Expo push, and WhatsApp.
 *
 * Every channel degrades safely. With no Twilio credentials WhatsApp is logged
 * instead of sent, and with no push tokens the push step is a no-op — so the
 * whole app works end-to-end on a laptop with nothing configured.
 */

const INR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export function hasWhatsApp() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.WHATSAPP_FROM);
}

// ---------------------------------------------------------------------------
// In-app notification feed
// ---------------------------------------------------------------------------

/**
 * Record a notification for a recipient. `audience` is 'buyer' or 'supplier',
 * `recipient` is their email.
 */
export async function addNotification(db, { audience, recipient, type, title, body, data = {} }) {
  if (!recipient) return null;
  const doc = {
    id: uuidv4(),
    audience,
    recipient: String(recipient).toLowerCase(),
    type,
    title,
    body,
    data,
    read: false,
    created_at: new Date().toISOString(),
  };
  await db.collection('notifications').insertOne(doc);
  return doc;
}

export async function listNotifications(db, recipient, { limit = 40 } = {}) {
  const query = { recipient: String(recipient).toLowerCase() };
  const [items, unread] = await Promise.all([
    db.collection('notifications').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(limit).toArray(),
    db.collection('notifications').countDocuments({ ...query, read: false }),
  ]);
  return { items, unread };
}

export async function markNotificationsRead(db, recipient, ids) {
  const query = { recipient: String(recipient).toLowerCase(), read: false };
  if (Array.isArray(ids) && ids.length) query.id = { $in: ids };
  const result = await db.collection('notifications').updateMany(query, {
    $set: { read: true, read_at: new Date().toISOString() },
  });
  return result.modifiedCount;
}

// ---------------------------------------------------------------------------
// Expo push
// ---------------------------------------------------------------------------

export async function sendPush(db, recipient, { title, body, data = {} }) {
  if (!recipient) return { sent: 0 };
  const tokens = await db.collection('push_tokens').find({ email: String(recipient).toLowerCase() }).toArray();
  if (!tokens.length) return { sent: 0 };
  const messages = tokens.map((t) => ({ to: t.expo_token, sound: 'default', title, body, data }));
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await response.json().catch(() => ({}));
    return { sent: tokens.length, response: json };
  } catch (error) {
    console.error('[push] send failed', error.message);
    return { sent: 0, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// WhatsApp (Twilio)
// ---------------------------------------------------------------------------

export async function sendWhatsApp(toE164, body) {
  if (!hasWhatsApp()) {
    console.log('[whatsapp:mock] %s -> %s', toE164, String(body).slice(0, 120));
    return { mocked: true, to: toE164 };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const form = new URLSearchParams({ From: process.env.WHATSAPP_FROM, To: `whatsapp:${toE164}`, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Twilio send failed');
  return { mocked: false, sid: data.sid, to: toE164 };
}

// ---------------------------------------------------------------------------
// Composite events
// ---------------------------------------------------------------------------

/** A new buyer request went live: alert every matching approved supplier. */
export async function notifySuppliersOfRequest(db, request) {
  const requirement = request.requirement || {};
  const brand = requirement.brand ? String(requirement.brand).toLowerCase() : null;
  const suppliers = await db.collection('suppliers').find({ status: 'approved' }).limit(200).toArray();

  const matches = suppliers.filter((supplier) => {
    const auths = (supplier.brand_authorisations || []).map((b) => String(b).toLowerCase());
    // No brand in the request, or supplier lists no authorisations -> everyone sees it.
    if (!brand || !auths.length) return true;
    return auths.some((a) => a.includes(brand) || brand.includes(a));
  });

  const summary = requirement.summary || requirement.product || 'a new requirement';
  const link = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?app&view=supplier`;
  const body =
    `🔔 New buyer request on BoliBazzar!\n\n${summary}\n\n` +
    `Budget: ${requirement.budget_inr ? INR(requirement.budget_inr) : 'flexible'}\n` +
    `Location: ${requirement.location || 'India'}\n` +
    `Qty: ${requirement.quantity || 1}\n\nBid now: ${link}`;

  const results = [];
  for (const supplier of matches) {
    await addNotification(db, {
      audience: 'supplier',
      recipient: supplier.email,
      type: 'new_request',
      title: 'New buyer request',
      body: summary,
      data: { request_id: request.id, budget_inr: requirement.budget_inr || null },
    });
    await sendPush(db, supplier.email, {
      title: '🔔 New buyer request',
      body: summary,
      data: { type: 'new_request', request_id: request.id },
    }).catch(() => null);

    if (!supplier.phone) {
      results.push({ supplier_id: supplier.id, business_name: supplier.business_name, skipped: 'no phone' });
      continue;
    }
    try {
      const sent = await sendWhatsApp(supplier.phone, body);
      results.push({ supplier_id: supplier.id, business_name: supplier.business_name, ...sent });
    } catch (error) {
      results.push({ supplier_id: supplier.id, business_name: supplier.business_name, error: error.message });
    }
  }

  await db.collection('whatsapp_log').insertOne({
    id: uuidv4(),
    request_id: request.id,
    sent_to: results,
    body,
    created_at: new Date().toISOString(),
  });
  return results;
}

/** A supplier bid on the buyer's request. */
export async function notifyBuyerOfOffer(db, request, offer) {
  if (!request?.buyer_email) return;
  const title = '🔔 New offer on BoliBazzar';
  const body = `${offer.supplier_name}: ${INR(offer.price_inr)} — ${offer.delivery_note}`;
  await addNotification(db, {
    audience: 'buyer',
    recipient: request.buyer_email,
    type: 'new_offer',
    title,
    body,
    data: { request_id: request.id, offer_id: offer.id, price_inr: offer.price_inr },
  });
  await sendPush(db, request.buyer_email, {
    title,
    body,
    data: { type: 'new_offer', request_id: request.id, offer_id: offer.id },
  }).catch(() => null);
}

/** A supplier dropped their price during the live auction. */
export async function notifyBuyerOfPriceDrop(db, request, offer, previousPrice) {
  if (!request?.buyer_email) return;
  await addNotification(db, {
    audience: 'buyer',
    recipient: request.buyer_email,
    type: 'price_drop',
    title: '📉 Price dropped',
    body: `${offer.supplier_name} cut their price to ${INR(offer.price_inr)} (was ${INR(previousPrice)})`,
    data: { request_id: request.id, offer_id: offer.id, price_inr: offer.price_inr, previous_price: previousPrice },
  });
}

/** Buyer accepted an offer — tell the winning supplier. */
export async function notifySupplierOfWin(db, offer, request) {
  if (!offer.supplier_email) return;
  const title = '🎉 You won a BoliBazzar order';
  const body = `${request?.requirement?.summary || 'Order'} — ${INR(offer.price_inr)}`;
  await addNotification(db, {
    audience: 'supplier',
    recipient: offer.supplier_email,
    type: 'offer_won',
    title,
    body,
    data: { offer_id: offer.id, request_id: offer.request_id },
  });
  await sendPush(db, offer.supplier_email, { title, body, data: { type: 'offer_won', offer_id: offer.id } }).catch(() => null);
  if (offer.supplier_phone) {
    await sendWhatsApp(offer.supplier_phone, `${title}\n\n${body}\n\nOpen your dashboard to arrange dispatch.`).catch(() => null);
  }
}

/** New chat message — notify whichever side is not the sender. */
export async function notifyChatMessage(db, message, { offer, request }) {
  const toBuyer = message.sender === 'supplier';
  const recipient = toBuyer ? request?.buyer_email : offer?.supplier_email;
  if (!recipient) return;
  const title = `💬 ${message.sender_name}`;
  await addNotification(db, {
    audience: toBuyer ? 'buyer' : 'supplier',
    recipient,
    type: 'chat_message',
    title,
    body: String(message.text).slice(0, 140),
    data: { offer_id: message.offer_id, request_id: offer?.request_id || null },
  });
  await sendPush(db, recipient, {
    title,
    body: String(message.text).slice(0, 140),
    data: { type: 'chat_message', offer_id: message.offer_id },
  }).catch(() => null);
}

/** Order moved to a new delivery stage. */
export async function notifyOrderStage(db, order, stage) {
  if (!order?.buyer_email) return;
  await addNotification(db, {
    audience: 'buyer',
    recipient: order.buyer_email,
    type: 'order_stage',
    title: `📦 ${stage.label}`,
    body: `Order ${order.tracking_id} — ${stage.label}`,
    data: { order_id: order.id, offer_id: order.offer_id, stage: stage.key },
  });
  await sendPush(db, order.buyer_email, {
    title: `📦 ${stage.label}`,
    body: `Order ${order.tracking_id} — ${stage.label}`,
    data: { type: 'order_stage', order_id: order.id, stage: stage.key },
  }).catch(() => null);
}

/**
 * Deliver a login code.
 *
 * Throws when no transport is configured for the channel. The caller must
 * surface that rather than swallow it: a user who never receives a code has no
 * way to sign in, and silently "succeeding" would hide a total auth outage.
 */
export async function sendOtp(db, { destination, channel, code }) {
  const body = `${code} is your BoliBazzar login code. It expires in 10 minutes. Never share it with anyone.`;

  if (channel === 'phone') {
    if (!hasWhatsApp()) {
      if (otpDeliveryOptional()) {
        console.log('[otp:whatsapp:mock] %s -> %s', destination, body);
        return { channel: 'whatsapp', mocked: true };
      }
      throw new Error('No WhatsApp transport configured (set TWILIO_* and WHATSAPP_FROM)');
    }
    const sent = await sendWhatsApp(destination, body);
    return { channel: 'whatsapp', ...sent };
  }

  if (!hasMailer()) {
    if (otpDeliveryOptional()) {
      console.log('[otp:email:mock] %s -> %s', destination, body);
      return { channel: 'email', mocked: true };
    }
    throw new Error('No email transport configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }
  const sent = await sendOtpEmail(destination, code);
  return { channel: 'email', ...sent };
}

/**
 * Outside production the code is also returned in the API response, so a
 * missing transport is an inconvenience rather than a lockout.
 */
function otpDeliveryOptional() {
  return process.env.APP_ENV !== 'production' && process.env.NODE_ENV !== 'production';
}
