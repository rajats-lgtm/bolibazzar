import { MongoClient } from 'mongodb';

/**
 * Lazy MongoDB connection.
 *
 * The client is created on first use rather than at import time. Importing a
 * route must never open a socket: Next collects page data at build time, which
 * would otherwise make every build depend on a reachable database.
 *
 * The promise is cached on globalThis so hot reloads in development reuse one
 * pool instead of leaking a new connection per reload.
 */
export async function getDb() {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not configured');

  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    })
      .connect()
      .catch((error) => {
        // Clear the cache so the next request retries instead of being stuck
        // with a permanently rejected promise.
        globalThis._mongoClientPromise = undefined;
        throw error;
      });
  }

  const client = await globalThis._mongoClientPromise;
  return client.db(process.env.DB_NAME || 'bolibazaar');
}
