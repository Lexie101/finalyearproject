/**
 * Rate Limiting Module
 * Prevents brute force attacks on login endpoints
 * 
 * Uses in-memory store (good for dev, use Redis in production)
 * Limits: 5 login attempts per 10 minutes per email
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - replace with Redis in production
const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check if an email has exceeded rate limit
 * @param email - The email to check (use lowercase)
 * @returns Object with allowed status and remaining attempts
 */
export function checkRateLimit(email: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = email.toLowerCase();

  let entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
    entry = undefined;
  }

  // First attempt or reset
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetTime: now + WINDOW_MS,
    };
  }

  // Increment counter
  entry.count++;

  const allowed = entry.count <= MAX_ATTEMPTS;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for an email (call after successful login)
 */
export function resetRateLimit(email: string): void {
  rateLimitStore.delete(email.toLowerCase());
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus(email: string): RateLimitEntry | null {
  const entry = rateLimitStore.get(email.toLowerCase());
  if (!entry) return null;

  if (Date.now() > entry.resetTime) {
    rateLimitStore.delete(email.toLowerCase());
    return null;
  }

  return entry;
}

/**
 * Clear all rate limit entries (for testing only)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
