import { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';
import { ApiError } from './errorHandler';

// Redis-backed fixed-window rate limiter so the limit is shared correctly
// across every horizontally-scaled Node instance (an in-memory limiter would
// only protect a single instance, which is useless behind a load balancer).
export function redisRateLimit(opts: {
  keyPrefix: string;
  windowSeconds: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const identity = opts.keyFn ? opts.keyFn(req) : req.ip ?? 'unknown';
    const key = `ratelimit:${opts.keyPrefix}:${identity}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSeconds);
    }
    if (count > opts.max) {
      throw new ApiError(429, 'Too many requests, please slow down');
    }
    next();
  };
}
