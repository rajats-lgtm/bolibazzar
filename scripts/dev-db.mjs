#!/usr/bin/env node
/**
 * Local development MongoDB.
 *
 * Boots a real mongod on 127.0.0.1:27017 with an on-disk data directory, so the
 * app can run end-to-end without installing MongoDB system-wide. Data persists
 * across restarts in .devdata/mongo.
 *
 * To point at a real cluster instead, set MONGO_URL in .env and skip this.
 *
 *   node scripts/dev-db.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = resolve(root, '.devdata/mongo');
mkdirSync(dbPath, { recursive: true });

const port = Number(process.env.DEV_DB_PORT || 27017);

console.log('[dev-db] starting mongod on port %d', port);
console.log('[dev-db] data directory: %s', dbPath);

const mongod = await MongoMemoryServer.create({
  instance: { port, dbPath, storageEngine: 'wiredTiger' },
});

console.log('[dev-db] ready  ->  %s', mongod.getUri());
console.log('[dev-db] leave this process running. Ctrl+C to stop.');

async function shutdown(signal) {
  console.log('\n[dev-db] %s received, stopping mongod...', signal);
  await mongod.stop();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Keep the event loop alive.
setInterval(() => {}, 1 << 30);
