import { MongoClient } from 'mongodb';

export function createClient(uri: string): MongoClient {
  return new MongoClient(uri, {
    appName: 'handbook-mongodb',
    maxPoolSize: 10,
    minPoolSize: 0,
    waitQueueTimeoutMS: 2_000,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
    socketTimeoutMS: 5_000,
  });
}
