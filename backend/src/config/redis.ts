import Redis from 'ioredis';
import { env } from './env';

// Separate connections per Socket.io adapter requirement (pub client must
// not also be used for subscribe), plus one general-purpose client for
// caching, OTP storage, rate limiting, and session lookups.
export const redis = new Redis(env.redisUrl, { lazyConnect: false });
export const redisPub = new Redis(env.redisUrl, { lazyConnect: false });
export const redisSub = new Redis(env.redisUrl, { lazyConnect: false });

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis client error', err);
});
