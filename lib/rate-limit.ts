/**
 * Simple in-memory rate limiter
 * Tracks request counts per key within a time window
 * 
 * Note: In-memory storage means rate limits reset on server restart
 * For production with multiple servers, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate-limited
 * 
 * @param key - Unique identifier for the rate limit (e.g., email, user ID)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous entry or window has expired
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    
    // Clean up expired entries periodically (every 100 requests)
    if (Math.random() < 0.01) {
      cleanupExpiredEntries();
    }
    
    return true;
  }

  // Within the time window
  if (entry.count < maxRequests) {
    entry.count++;
    return true;
  }

  // Rate limit exceeded
  return false;
}

/**
 * Get time remaining until rate limit resets (in seconds)
 * 
 * @param key - Unique identifier for the rate limit
 * @returns seconds until reset, or 0 if no active rate limit
 */
export function getRateLimitResetTime(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry) return 0;

  const now = Date.now();
  if (now >= entry.resetAt) return 0;

  return Math.ceil((entry.resetAt - now) / 1000);
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or manual reset
 * 
 * @param key - Unique identifier for the rate limit
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clean up expired rate limit entries
 * Called periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  rateLimitStore.forEach((entry, key) => {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    console.log(`[RateLimit] Cleaned up ${cleanedCount} expired entries`);
  }
}

/**
 * Get current rate limit stats (for monitoring/debugging)
 * 
 * @param key - Unique identifier for the rate limit
 * @returns current count and reset time, or null if no entry
 */
export function getRateLimitStats(key: string): { count: number; resetAt: number } | null {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now >= entry.resetAt) {
    rateLimitStore.delete(key);
    return null;
  }
  
  return { count: entry.count, resetAt: entry.resetAt };
}
