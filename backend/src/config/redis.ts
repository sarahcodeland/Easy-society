import Redis from 'ioredis';
import { env } from './env';

// Cache client: fail fast so cache misses fall through to DB instead of hanging
export const redis = new Redis(env.redisUrl, {
  connectTimeout: 5000,
  commandTimeout: 3000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// Pub/sub clients for Socket.IO adapter: must keep offline queue enabled so
// psubscribe can be retried automatically when Redis reconnects
export const redisPub = new Redis(env.redisUrl, { connectTimeout: 5000 });
export const redisSub = new Redis(env.redisUrl, { connectTimeout: 5000 });

for (const client of [redis, redisPub, redisSub]) {
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Redis client error', err);
  });
}
