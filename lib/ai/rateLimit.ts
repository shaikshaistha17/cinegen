// In-memory sliding-window rate limiter

type RateLimitResult = { allowed: boolean; retryAfterMs?: number };

// Store timestamps per userId+endpoint combo
const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps for this key
  let timestamps = requestLog.get(key) || [];

  // Evict old entries outside the window
  timestamps = timestamps.filter((ts) => ts > windowStart);

  // Check if limit exceeded
  if (timestamps.length >= maxRequests) {
    const oldestInWindow = Math.min(...timestamps);
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  // Add current timestamp
  timestamps.push(now);
  requestLog.set(key, timestamps);

  return { allowed: true };
}
