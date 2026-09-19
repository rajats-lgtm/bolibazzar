#!/usr/bin/env node
/**
 * Seed the database with indexes, demo supplier accounts and a test buyer.
 *
 * Safe to re-run: everything is upserted by a stable id, so existing data and
 * any real accounts you have created are left alone.
 *
 *   node scripts/seed.mjs
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader so this runs on any Node 20 without extra flags.
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch {
  console.warn('[seed] no .env found, relying on the ambient environment');
}

const uri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'bolibazaar';

// Stable ids keep re-runs idempotent.
const id = (key) => crypto.createHash('sha1').update('bolibazzar-seed:' + key).digest('hex').slice(0, 32);

const DEMO_SUPPLIERS = [
  { key: 'croma-andheri', business_name: 'Croma', city: 'Mumbai', supplier_type: 'retail_store', rating: 4.6, reviews: 3240, brands: ['Apple', 'Samsung', 'Sony', 'LG'], gst: '27AAECI1681G1ZP' },
  { key: 'reliance-bkc', business_name: 'Reliance Digital', city: 'Mumbai', supplier_type: 'retail_store', rating: 4.5, reviews: 4890, brands: [], gst: '27AABCR1718E1ZL' },
  { key: 'vijay-dadar', business_name: 'Vijay Sales', city: 'Mumbai', supplier_type: 'retail_store', rating: 4.4, reviews: 2110, brands: [], gst: '27AAAFV2320N1Z8' },
  { key: 'poorvika', business_name: 'Poorvika Mobiles', city: 'Bengaluru', supplier_type: 'authorised_reseller', rating: 4.7, reviews: 5200, brands: ['Apple', 'Samsung', 'Xiaomi', 'OnePlus'], gst: '29AAFCP4715D1ZQ' },
  { key: 'sangeetha', business_name: 'Sangeetha Mobiles', city: 'Bengaluru', supplier_type: 'authorised_reseller', rating: 4.5, reviews: 3980, brands: ['Samsung', 'Vivo', 'Oppo'], gst: '29AACCS8991M1ZH' },
  { key: 'iplanet-blr', business_name: 'iPlanet', city: 'Bengaluru', supplier_type: 'brand_store', rating: 4.8, reviews: 1290, brands: ['Apple'], gst: '29AAGCF2194N1Z1' },
  { key: 'unicorn-delhi', business_name: 'Unicorn Store', city: 'Delhi', supplier_type: 'brand_store', rating: 4.8, reviews: 1780, brands: ['Apple'], gst: '07AAFCU5679P1ZM' },
  { key: 'bajaj-hyd', business_name: 'Bajaj Electronics', city: 'Hyderabad', supplier_type: 'retail_store', rating: 4.4, reviews: 2560, brands: [], gst: '36AAACB1534K1ZR' },
  { key: 'girias-chennai', business_name: 'Girias', city: 'Chennai', supplier_type: 'retail_store', rating: 4.5, reviews: 1890, brands: [], gst: '33AAAFG4419L1ZB' },
  { key: 'ezone-pune', business_name: 'Ezone Electronics', city: 'Pune', supplier_type: 'retail_store', rating: 4.3, reviews: 1450, brands: [], gst: '27AABCE2841J1ZV' },
];

const INDEXES = {
  users: [[{ email: 1 }, { unique: true }]],
  suppliers: [[{ id: 1 }, { unique: true }], [{ email: 1 }, { unique: true }], [{ status: 1, is_demo: 1 }, {}]],
  requests: [[{ id: 1 }, { unique: true }], [{ buyer_email: 1, created_at: -1 }, {}], [{ status: 1, created_at: -1 }, {}]],
  offers: [[{ id: 1 }, { unique: true }], [{ request_id: 1, value_score: -1 }, {}], [{ supplier_id: 1, created_at: -1 }, {}], [{ supplier_email: 1, created_at: -1 }, {}]],
  orders: [[{ id: 1 }, { unique: true }], [{ offer_id: 1 }, { unique: true }], [{ buyer_email: 1, created_at: -1 }, {}], [{ supplier_email: 1, created_at: -1 }, {}]],
  payments: [[{ id: 1 }, { unique: true }], [{ razorpay_order_id: 1 }, {}], [{ buyer_email: 1, created_at: -1 }, {}]],
  messages: [[{ offer_id: 1, created_at: 1 }, {}]],
  notifications: [[{ recipient: 1, created_at: -1 }, {}], [{ recipient: 1, read: 1 }, {}]],
  wallets: [[{ email: 1 }, { unique: true }]],
  reviews: [[{ supplier_id: 1, created_at: -1 }, {}], [{ offer_id: 1 }, {}]],
  supplier_rules: [[{ supplier_email: 1 }, {}], [{ enabled: 1 }, {}]],
  push_tokens: [[{ expo_token: 1 }, { unique: true }], [{ email: 1 }, {}]],
  otps: [[{ destination: 1, created_at: -1 }, {}], [{ expires_at: 1 }, { expireAfterSeconds: 0 }]],
  groups: [[{ product_key: 1, status: 1 }, {}]],
  admin_audit: [[{ created_at: -1 }, {}]],
  platform_settings: [[{ key: 1 }, { unique: true }]],
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(dbName);
console.log('[seed] connected to %s/%s', uri, dbName);

// --- indexes --------------------------------------------------------------
let indexCount = 0;
for (const [collection, specs] of Object.entries(INDEXES)) {
  for (const [keys, options] of specs) {
    try {
      await db.collection(collection).createIndex(keys, options);
      indexCount++;
    } catch (error) {
      console.warn('[seed] index %s %j skipped: %s', collection, keys, error.message);
    }
  }
}
console.log('[seed] ensured %d indexes across %d collections', indexCount, Object.keys(INDEXES).length);

// --- demo suppliers -------------------------------------------------------
const now = new Date().toISOString();
for (const supplier of DEMO_SUPPLIERS) {
  const email = `${supplier.key}@demo.bolibazzar.in`;
  await db.collection('suppliers').updateOne(
    { id: id(supplier.key) },
    {
      $set: {
        business_name: supplier.business_name,
        city: supplier.city,
        supplier_type: supplier.supplier_type,
        rating: supplier.rating,
        reviews: supplier.reviews,
        brand_authorisations: supplier.brands,
        gst: supplier.gst,
        gst_valid: true,
        status: 'approved',
        is_demo: true,
        categories: ['electronics'],
        address: `${supplier.business_name}, ${supplier.city}`,
        phone: null,
        updated_at: now,
      },
      $setOnInsert: { id: id(supplier.key), email, created_at: now },
    },
    { upsert: true }
  );
}
console.log('[seed] upserted %d demo suppliers', DEMO_SUPPLIERS.length);

// --- test accounts --------------------------------------------------------
const buyerEmail = 'buyer@test.in';
await db.collection('users').updateOne(
  { email: buyerEmail },
  {
    $set: { name: 'Priya Sharma', role: 'buyer', status: 'active', updated_at: now },
    $setOnInsert: { id: id('buyer'), email: buyerEmail, total_spent_inr: 0, created_at: now },
  },
  { upsert: true }
);
await db.collection('wallets').updateOne(
  { email: buyerEmail },
  { $setOnInsert: { email: buyerEmail, balance_inr: 2500, transactions: [], created_at: now } },
  { upsert: true }
);

const supplierEmail = 'supplier@test.in';
await db.collection('suppliers').updateOne(
  { email: supplierEmail },
  {
    $set: {
      business_name: 'Test Electronics Store',
      city: 'Mumbai',
      supplier_type: 'retail_store',
      status: 'approved',
      gst: '27AAECT1234A1Z5',
      gst_valid: true,
      is_demo: false,
      brand_authorisations: ['Apple', 'Samsung'],
      categories: ['electronics'],
      rating: 4.5,
      reviews: 0,
      phone: null,
      updated_at: now,
    },
    $setOnInsert: { id: id('test-supplier'), email: supplierEmail, created_at: now },
  },
  { upsert: true }
);

console.log('[seed] test accounts ready');
console.log('');
console.log('  Buyer    %s', buyerEmail);
console.log('  Supplier %s', supplierEmail);
console.log('  Admin    %s', process.env.ADMIN_EMAILS || '(set ADMIN_EMAILS)');
console.log('');
console.log('  Log in with OTP — with OTP_DEV_MODE=true the code is returned in the API response.');

await client.close();
console.log('[seed] done');
