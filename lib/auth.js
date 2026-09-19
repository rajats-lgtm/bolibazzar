import crypto from 'crypto';

/**
 * Session + OTP primitives for BoliBazzar.
 *
 * Sessions are stateless signed tokens carried in httpOnly cookies. The expiry
 * is *inside* the signed payload, so a copied cookie stops working on the
 * server at the same moment it would expire in the browser.
 *
 * Token format:  base64url(JSON payload) + "." + hex(HMAC-SHA256)
 */

export const ROLES = { BUYER: 'buyer', SUPPLIER: 'supplier', ADMIN: 'admin' };

const COOKIE_NAMES = {
  [ROLES.BUYER]: 'bb_buyer_session',
  [ROLES.SUPPLIER]: 'bb_supplier_session',
  [ROLES.ADMIN]: 'bb_admin_session',
};

const TTL_MS = {
  [ROLES.BUYER]: 30 * 24 * 60 * 60 * 1000, // 30 days
  [ROLES.SUPPLIER]: 14 * 24 * 60 * 60 * 1000, // 14 days
  [ROLES.ADMIN]: 8 * 60 * 60 * 1000, // 8 hours
};

export function cookieName(role) {
  return COOKIE_NAMES[role] || COOKIE_NAMES[ROLES.BUYER];
}

function secretFor(role) {
  if (role === ROLES.ADMIN) {
    const key = process.env.ADMIN_ACCESS_KEY;
    if (!key) throw new Error('ADMIN_ACCESS_KEY is not configured');
    return key;
  }
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error('SESSION_SECRET is not configured');
  return key;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function hmac(role, data) {
  return crypto.createHmac('sha256', secretFor(role)).update(data).digest('hex');
}

/** Constant-time string compare that never throws on length mismatch. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(role, subject, extra = {}) {
  const payload = { r: role, s: String(subject).toLowerCase(), e: Date.now() + (TTL_MS[role] || TTL_MS[ROLES.BUYER]), ...extra };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(role, body)}`;
}

/**
 * Verify a token for the given role. Returns the payload or null.
 * Never throws — a malformed cookie is simply "not logged in".
 */
export function verifySessionToken(role, token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const idx = token.lastIndexOf('.');
    if (idx < 1) return null;
    const body = token.slice(0, idx);
    const sig = token.slice(idx + 1);
    if (!safeEqual(sig, hmac(role, body))) return null;
    const payload = JSON.parse(fromB64url(body).toString('utf8'));
    if (payload.r !== role) return null;
    if (!payload.e || Date.now() > Number(payload.e)) return null;
    if (!payload.s) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Read the session subject (email) for a role.
 *
 * Web clients send an httpOnly cookie. Native apps cannot rely on a cookie jar,
 * so they send the same signed token as `Authorization: Bearer <token>`. The
 * token embeds its role, so a supplier token can never satisfy a buyer check.
 */
export function sessionSubject(req, role) {
  const cookie = req.cookies?.get?.(cookieName(role))?.value || '';
  const fromCookie = verifySessionToken(role, cookie);
  if (fromCookie) return fromCookie.s;

  const header = req.headers?.get?.('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const fromBearer = verifySessionToken(role, match[1].trim());
  return fromBearer ? fromBearer.s : null;
}

const baseCookie = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

export function attachSession(response, role, subject, extra = {}) {
  response.cookies.set(cookieName(role), createSessionToken(role, subject, extra), {
    ...baseCookie,
    sameSite: role === ROLES.ADMIN ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor((TTL_MS[role] || TTL_MS[ROLES.BUYER]) / 1000),
  });
  return response;
}

export function clearSession(response, role) {
  response.cookies.set(cookieName(role), '', {
    ...baseCookie,
    sameSite: role === ROLES.ADMIN ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
  return response;
}

// ---------------------------------------------------------------------------
// One-time passcodes
// ---------------------------------------------------------------------------

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp() {
  // 6 digits, uniformly distributed, cryptographically random.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Codes are stored hashed so a database dump cannot be replayed. */
export function hashOtp(destination, code) {
  const salt = process.env.SESSION_SECRET || 'bolibazzar-dev';
  return crypto.createHmac('sha256', salt).update(`${String(destination).toLowerCase()}:${code}`).digest('hex');
}

/** True when OTPs may be returned in the API response (local dev only). */
export function otpDevMode() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.OTP_DEV_MODE !== 'false';
}

export function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

/** Accepts 9876543210, +919876543210, 09876543210 -> +919876543210 */
export function normalisePhone(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10 || !/^[6-9]/.test(local)) return null;
  return `+91${local}`;
}
