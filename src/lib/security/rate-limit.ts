/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance / low-traffic deployments.
 * For multi-instance production, replace with Redis/Upstash.
 */

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded memory growth. */
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const maxAge = 30 * 60_000;
  for (const [key, bucket] of store.entries()) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < maxAge);
    if (bucket.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      success: false,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  bucket.timestamps.push(now);
  return {
    success: true,
    remaining: max - bucket.timestamps.length,
    resetMs: windowMs,
  };
}

/** Test helper: clear all buckets. */
export function resetRateLimits() {
  store.clear();
}
