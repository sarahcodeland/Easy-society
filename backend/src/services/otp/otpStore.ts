import crypto from 'crypto';
import { redis } from '../../config/redis';

const OTP_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

function otpKey(phoneNumber: string) {
  return `otp:${phoneNumber}`;
}
function attemptsKey(phoneNumber: string) {
  return `otp:attempts:${phoneNumber}`;
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function storeOtp(phoneNumber: string, otp: string): Promise<void> {
  await redis.set(otpKey(phoneNumber), otp, 'EX', OTP_TTL_SECONDS);
  await redis.del(attemptsKey(phoneNumber));
}

export async function verifyOtp(phoneNumber: string, candidate: string): Promise<boolean> {
  const attempts = await redis.incr(attemptsKey(phoneNumber));
  if (attempts === 1) {
    await redis.expire(attemptsKey(phoneNumber), OTP_TTL_SECONDS);
  }
  if (attempts > MAX_VERIFY_ATTEMPTS) {
    return false;
  }
  const stored = await redis.get(otpKey(phoneNumber));
  if (!stored || stored !== candidate) {
    return false;
  }
  await redis.del(otpKey(phoneNumber));
  await redis.del(attemptsKey(phoneNumber));
  return true;
}
