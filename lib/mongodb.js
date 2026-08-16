import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not configured');

const globalCache = globalThis;
if (!globalCache.__witchMapMongoPromise) {
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  globalCache.__witchMapMongoPromise = client.connect();
}

export const mongoClient = await globalCache.__witchMapMongoPromise;
export const database = mongoClient.db(process.env.MONGODB_DB || 'witchmap_prd');
