import { redis } from '../config/redis';

// Generic read-through cache helper used for area feeds (Q&A, marketplace,
// announcements) so hot reads at 50k-1M concurrent users don't all hit
// Postgres directly.
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) {
    return JSON.parse(hit) as T;
  }
  const value = await loader();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}

export async function invalidate(keyOrPrefix: string, isPrefix = false): Promise<void> {
  if (!isPrefix) {
    await redis.del(keyOrPrefix);
    return;
  }
  const stream = redis.scanStream({ match: `${keyOrPrefix}*`, count: 100 });
  const pipeline = redis.pipeline();
  let queued = 0;
  for await (const keys of stream) {
    for (const key of keys as string[]) {
      pipeline.del(key);
      queued += 1;
    }
  }
  if (queued > 0) {
    await pipeline.exec();
  }
}
