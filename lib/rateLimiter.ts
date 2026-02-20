// In-memory rate limiter (Redis removed - not required)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter.
 * key should be namespaced (e.g. `otp:email@example.com` or `loc:userId`).
 * windowMs is the window in milliseconds.
 * limit is the max allowed events in the window.
 */
export async function checkRateLimit(key: string, windowMs: number, limit: number) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, ttl: windowMs };
  }

  // Within window
  const allowed = entry.count < limit;
  if (allowed) {
    entry.count++;
  }

  return { allowed, remaining: Math.max(0, limit - entry.count), ttl: entry.resetTime - now };
}

export async function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

// Optional: Clean up old entries periodically
if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60 * 1000); // Clean every minute
}
