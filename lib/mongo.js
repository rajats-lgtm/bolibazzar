import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'bolibazaar';

if (!uri) throw new Error('MONGO_URL missing');

const g = globalThis;
if (!g._mongoClientPromise) {
  const client = new MongoClient(uri);
  g._mongoClientPromise = client.connect();
}

export async function getDb() {
  const client = await g._mongoClientPromise;
  return client.db(dbName);
}
