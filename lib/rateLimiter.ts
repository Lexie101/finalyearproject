import { redis } from "./redis";

/**
 * Simple Redis-backed rate limiter.
 * key should be namespaced (e.g. `otp:email@example.com` or `loc:userId`).
 * windowMs is the window in milliseconds.
 * limit is the max allowed events in the window.
 */
export async function checkRateLimit(key: string, windowMs: number, limit: number) {
  if (!redis) {
    return { allowed: true, remaining: limit };
  }

  const tx = redis.multi();
  tx.incr(key);
  tx.pttl(key);
  const res = await tx.exec();
  if (!res) return { allowed: true, remaining: limit };

  const count = Number(res[0][1] ?? 0);
  let ttl = Number(res[1][1]);
  if (ttl < 0) {
    await redis.pexpire(key, windowMs);
    ttl = windowMs;
  }

  const allowed = count <= limit;
  return { allowed, remaining: Math.max(0, limit - count), ttl };
}

export async function resetRateLimit(key: string) {
  if (!redis) return;
  await redis.del(key);
}
