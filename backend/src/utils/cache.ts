import { redis } from '../config/redis';

// Falls through to the loader when Redis is unavailable so a cache outage
// never takes down the API — requests are slower but still succeed.
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // Redis unavailable — skip cache read, go straight to DB
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Redis unavailable — skip cache write, value still returned
  }

  return value;
}

export async function invalidate(keyOrPrefix: string, isPrefix = false): Promise<void> {
  try {
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
    if (queued > 0) await pipeline.exec();
  } catch {
    // Redis unavailable — invalidation skipped, stale cache may persist
  }
}
