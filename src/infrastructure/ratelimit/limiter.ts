/** Sliding-window in-memory limiter. Swap for Redis (REDIS_URL) in multi-instance deployments — same interface. */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now(); const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { buckets.set(key, arr); return { ok: false, remaining: 0, retryAfterMs: windowMs - (now - arr[0]) }; }
  arr.push(now); buckets.set(key, arr);
  if (buckets.size > 10000) for (const [k, v] of buckets) if (v.every((t) => now - t > windowMs)) buckets.delete(k);
  return { ok: true, remaining: limit - arr.length, retryAfterMs: 0 };
}
export function clientKey(headers: Headers): string {
  // Only a coarse key for abuse prevention; not persisted, not used for analytics.
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "anon";
}
