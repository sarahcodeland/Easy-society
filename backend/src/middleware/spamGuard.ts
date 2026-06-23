import { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';
import { ApiError } from './errorHandler';

// Per-user content-creation throttle, shared across all instances via Redis.
// Distinct from redisRateLimit (which is IP/phone-keyed for auth endpoints) —
// this one is for "stop a single account from flooding the area feed."
export function spamGuard(opts: { keyPrefix: string; windowSeconds: number; max: number }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next();
    const key = `spamguard:${opts.keyPrefix}:${req.auth.userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, opts.windowSeconds);
    if (count > opts.max) {
      throw new ApiError(429, 'You are posting too frequently — please slow down');
    }
    next();
  };
}
