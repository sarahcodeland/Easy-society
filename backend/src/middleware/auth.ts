import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@easysociety/shared';
import { env } from '../config/env';
import { ApiError } from './errorHandler';
import { redis } from '../config/redis';
import { pool } from '../db/pool';

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

// Cached for a short window so we're not hitting Postgres on every request
// across a fleet of instances just to check a boolean.
async function isBanned(userId: string): Promise<boolean> {
  const cacheKey = `user:banned:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return cached === '1';

  const { rows } = await pool.query('SELECT is_banned FROM users WHERE id = $1', [userId]);
  const banned = rows[0]?.is_banned === true;
  await redis.set(cacheKey, banned ? '1' : '0', 'EX', 60);
  return banned;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing bearer token');
  }
  try {
    req.auth = verifyAuthToken(header.slice('Bearer '.length));
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
  if (await isBanned(req.auth.userId)) {
    throw new ApiError(403, 'This account has been banned');
  }
  next();
}

// Best-effort: attaches req.auth if a valid token is present, but does not
// reject the request otherwise. Useful for endpoints that behave
// differently for logged-in vs anonymous users without requiring login.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.auth = verifyAuthToken(header.slice('Bearer '.length));
    } catch {
      // ignore invalid token, treat as anonymous
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new ApiError(403, 'Insufficient permissions');
    }
    next();
  };
}
