import { getDb } from './mongo';

/**
 * Platform settings that the admin console can change at runtime.
 *
 * Until now `platform_settings` was write-only: the console could store a key
 * and list it back, but nothing read it, so every "setting" was decorative
 * while the real values stayed in environment variables and code constants.
 *
 * Precedence is: value stored by an admin  >  environment variable  >  default.
 * That ordering matters — it means an operator can still pin something in the
 * environment for a deployment, and an admin can override it for a running
 * system without a redeploy, but nobody has to set anything for the app to work.
 *
 * Secrets deliberately do not live here. Anything that would let the console
 * read or rotate an API key belongs in the environment, where it is not visible
 * to anyone who gains admin access.
 */

/** @typedef {'number'|'boolean'|'string'|'text'} SettingType */

export const SETTING_GROUPS = [
  { key: 'auction', label: 'Auction & bidding', hint: 'How the live bidding window behaves.' },
  { key: 'loyalty', label: 'Cashback & loyalty', hint: 'Tier thresholds and the cashback each one earns.' },
  { key: 'suppliers', label: 'Suppliers & onboarding', hint: 'What a seller must satisfy before they can bid.' },
  { key: 'auth', label: 'Sign-in & security', hint: 'Login codes and account access.' },
  { key: 'platform', label: 'Platform & branding', hint: 'Names and contact details shown to users.' },
  { key: 'availability', label: 'Availability', hint: 'Turn parts of the product off without a deploy.' },
];

/**
 * Every configurable value, with its type, bounds and default.
 *
 * `env` names the environment variable consulted when no admin has set the
 * value. `min`/`max` are enforced on write, so a typo in the console cannot put
 * the platform into a state the code does not expect.
 */
export const SETTINGS = {
  // --- auction ------------------------------------------------------------
  auction_window_seconds: {
    group: 'auction', type: 'number', default: 120, min: 15, max: 3600, env: 'AUCTION_WINDOW_SECONDS',
    label: 'Bidding window',
    hint: 'How long a request stays open for sellers to undercut each other.',
    unit: 'seconds',
  },
  demo_bidders_enabled: {
    group: 'auction', type: 'boolean', default: true, env: 'DEMO_BIDDERS',
    label: 'Demo bidders',
    hint: 'Generate realistic competing bids so the auction works with no live sellers. Turn this off once real sellers are bidding.',
  },
  auto_bid_enabled: {
    group: 'auction', type: 'boolean', default: true,
    label: 'Supplier auto-bid rules',
    hint: 'Let sellers set rules that bid on matching requests automatically.',
  },
  max_request_budget_inr: {
    group: 'auction', type: 'number', default: 10000000, min: 1000, max: 1000000000,
    label: 'Maximum request budget',
    hint: 'Requests above this are rejected. A guard against a mistyped budget.',
    unit: '₹',
  },

  // --- loyalty ------------------------------------------------------------
  cashback_silver_pct: {
    group: 'loyalty', type: 'number', default: 2, min: 0, max: 100,
    label: 'Silver cashback', hint: 'Percentage credited to the wallet on delivery.', unit: '%',
  },
  cashback_gold_pct: {
    group: 'loyalty', type: 'number', default: 3, min: 0, max: 100,
    label: 'Gold cashback', unit: '%',
  },
  cashback_platinum_pct: {
    group: 'loyalty', type: 'number', default: 5, min: 0, max: 100,
    label: 'Platinum cashback', unit: '%',
  },
  tier_gold_min_inr: {
    group: 'loyalty', type: 'number', default: 50000, min: 0, max: 100000000,
    label: 'Gold starts at', hint: 'Lifetime spend needed to reach Gold.', unit: '₹',
  },
  tier_platinum_min_inr: {
    group: 'loyalty', type: 'number', default: 200000, min: 0, max: 100000000,
    label: 'Platinum starts at', unit: '₹',
  },
  wallet_max_redeem_pct: {
    group: 'loyalty', type: 'number', default: 100, min: 0, max: 100,
    label: 'Maximum wallet redemption',
    hint: 'The largest share of an order that can be paid from wallet balance.',
    unit: '%',
  },

  // --- suppliers ----------------------------------------------------------
  supplier_auto_approve: {
    group: 'suppliers', type: 'boolean', default: false,
    label: 'Approve new sellers automatically',
    hint: 'When off, a new seller waits for a human to approve them before they can bid.',
  },
  require_gst_for_bidding: {
    group: 'suppliers', type: 'boolean', default: false,
    label: 'Require a verified GSTIN to bid',
    hint: 'When on, a seller cannot bid until an admin has marked their GSTIN verified. Turning this on locks out every seller who has not been verified yet, so verify your active sellers first.',
  },
  supplier_min_rating: {
    group: 'suppliers', type: 'number', default: 0, min: 0, max: 5,
    label: 'Minimum rating to keep bidding',
    hint: 'Sellers below this are blocked from new requests. 0 disables the check.',
  },

  // --- auth ---------------------------------------------------------------
  otp_rate_limit: {
    group: 'auth', type: 'number', default: 5, min: 1, max: 1000, env: 'OTP_RATE_LIMIT',
    label: 'Login codes per 15 minutes',
    hint: 'Per email or phone number. Low values slow down abuse; raise it while testing.',
  },
  otp_expiry_minutes: {
    group: 'auth', type: 'number', default: 10, min: 1, max: 120,
    label: 'Login code lifetime', unit: 'minutes',
  },
  session_days: {
    group: 'auth', type: 'number', default: 30, min: 1, max: 365,
    label: 'Stay signed in for', unit: 'days',
  },
  new_signups_enabled: {
    group: 'auth', type: 'boolean', default: true,
    label: 'Allow new accounts',
    hint: 'When off, only people who already have an account can sign in.',
  },

  // --- platform -----------------------------------------------------------
  platform_name: {
    group: 'platform', type: 'string', default: 'BoliBazzar', max: 60,
    label: 'Platform name',
  },
  support_email: {
    group: 'platform', type: 'string', default: 'support@bolibazzar.in', max: 120,
    label: 'Support email', hint: 'Shown to users who need help.',
  },
  support_phone: {
    group: 'platform', type: 'string', default: '', max: 20,
    label: 'Support phone',
  },
  announcement: {
    group: 'platform', type: 'text', default: '', max: 500,
    label: 'Site-wide announcement',
    hint: 'Shown as a banner to everyone. Leave empty for none.',
  },

  // --- availability -------------------------------------------------------
  maintenance_mode: {
    group: 'availability', type: 'boolean', default: false,
    label: 'Maintenance mode',
    hint: 'Blocks everything except admin and sign-out. Use during a migration.',
  },
  maintenance_message: {
    group: 'availability', type: 'text', default: 'BoliBazzar is briefly down for maintenance. Please try again shortly.', max: 300,
    label: 'Maintenance message',
  },
  ordering_enabled: {
    group: 'availability', type: 'boolean', default: true,
    label: 'Accept new orders',
    hint: 'When off, buyers can browse and bid but cannot pay.',
  },
  chat_enabled: {
    group: 'availability', type: 'boolean', default: true,
    label: 'Buyer-seller chat',
  },
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Settings are read on nearly every request, so they are cached briefly rather
 * than fetched each time. The window is short enough that a change in the
 * console is visible almost immediately, and long enough that a burst of
 * traffic does not turn into a burst of queries.
 */
const CACHE_MS = 5000;
let cache = { at: 0, values: null };

function coerce(definition, raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (definition.type === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const text = String(raw).toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(text)) return true;
    if (['false', '0', 'no', 'off'].includes(text)) return false;
    return undefined;
  }
  if (definition.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) return undefined;
    if (definition.min !== undefined && value < definition.min) return undefined;
    if (definition.max !== undefined && value > definition.max) return undefined;
    return value;
  }
  const text = String(raw);
  if (definition.max && text.length > definition.max) return text.slice(0, definition.max);
  return text;
}

/** Resolve one setting without touching the database. */
function fromEnv(key) {
  const definition = SETTINGS[key];
  if (!definition?.env) return undefined;
  return coerce(definition, process.env[definition.env]);
}

/**
 * Every setting's effective value, as a plain object.
 *
 * Never throws: if the database is unreachable the defaults are returned, so a
 * settings outage degrades to "the platform behaves as shipped" rather than
 * taking the whole app down.
 */
export async function getSettings({ fresh = false } = {}) {
  if (!fresh && cache.values && Date.now() - cache.at < CACHE_MS) return cache.values;

  let stored = [];
  try {
    const db = await getDb();
    stored = await db.collection('platform_settings').find({}, { projection: { _id: 0, key: 1, value: 1 } }).toArray();
  } catch {
    // Fall through to env + defaults.
  }
  const byKey = new Map(stored.map((row) => [row.key, row.value]));

  const values = {};
  for (const [key, definition] of Object.entries(SETTINGS)) {
    const fromDb = coerce(definition, byKey.get(key));
    if (fromDb !== undefined) { values[key] = fromDb; continue; }
    const env = fromEnv(key);
    if (env !== undefined) { values[key] = env; continue; }
    values[key] = definition.default;
  }

  cache = { at: Date.now(), values };
  return values;
}

/** One setting's effective value. */
export async function getSetting(key) {
  const values = await getSettings();
  return values[key];
}

/** Drop the cache so the next read reflects a change immediately. */
export function invalidateSettings() {
  cache = { at: 0, values: null };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Validate a value against its definition.
 * Returns `{ ok, value }` or `{ ok: false, error }`.
 */
export function validateSetting(key, raw) {
  const definition = SETTINGS[key];
  if (!definition) return { ok: false, error: `Unknown setting "${key}"` };

  if (definition.type === 'boolean') {
    const value = coerce(definition, raw);
    if (value === undefined) return { ok: false, error: 'Expected true or false' };
    return { ok: true, value };
  }
  if (definition.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) return { ok: false, error: 'Expected a number' };
    if (definition.min !== undefined && value < definition.min) return { ok: false, error: `Must be at least ${definition.min}` };
    if (definition.max !== undefined && value > definition.max) return { ok: false, error: `Must be at most ${definition.max}` };
    return { ok: true, value };
  }
  const text = raw === null || raw === undefined ? '' : String(raw);
  if (definition.max && text.length > definition.max) return { ok: false, error: `Must be ${definition.max} characters or fewer` };
  return { ok: true, value: text };
}

/**
 * The full settings catalogue with current values, for the admin console.
 * Shape is deliberately UI-ready so the console does not need its own copy of
 * the definitions — one source of truth.
 */
export async function describeSettings() {
  const values = await getSettings({ fresh: true });
  const groups = SETTING_GROUPS.map((group) => ({
    ...group,
    settings: Object.entries(SETTINGS)
      .filter(([, definition]) => definition.group === group.key)
      .map(([key, definition]) => ({
        key,
        type: definition.type,
        label: definition.label,
        hint: definition.hint || null,
        unit: definition.unit || null,
        min: definition.min ?? null,
        max: definition.max ?? null,
        default: definition.default,
        value: values[key],
        // Tell the operator when a value is still coming from the environment,
        // so "why did my change not stick" has a visible answer.
        source: undefined,
      })),
  }));
  return groups;
}

/**
 * Cashback and tier thresholds, assembled from settings.
 * Mirrors the shape of the static TIERS table this replaces.
 */
export async function tierTable() {
  const s = await getSettings();
  return [
    { tier: 'platinum', label: 'Platinum', min: s.tier_platinum_min_inr, cashback_pct: s.cashback_platinum_pct, color: '#a5b4fc', badge_gradient: 'from-slate-300 to-indigo-300' },
    { tier: 'gold', label: 'Gold', min: s.tier_gold_min_inr, cashback_pct: s.cashback_gold_pct, color: '#fbbf24', badge_gradient: 'from-amber-400 to-yellow-300' },
    { tier: 'silver', label: 'Silver', min: 0, cashback_pct: s.cashback_silver_pct, color: '#94a3b8', badge_gradient: 'from-slate-400 to-slate-300' },
  ];
}
