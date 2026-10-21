interface Bucket {
  count: number;
  resetAt: number;
}

type RateLimitGlobal = typeof globalThis & {
  __dsRateBuckets?: Map<string, Bucket>;
  __dsDailyUsage?: { day: string; count: number };
};

const globalStore = globalThis as RateLimitGlobal;
const buckets = (globalStore.__dsRateBuckets ??= new Map<string, Bucket>());
const daily = (globalStore.__dsDailyUsage ??= { day: "", count: 0 });

export interface RateLimitInfo {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

/**
 * Fixed-window per-key limiter. In-memory only: it resets on restart and is
 * not shared between serverless instances.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): RateLimitInfo {
  if (limit <= 0) {
    return { ok: true, limit: 0, remaining: -1, retryAfter: 0 };
  }

  const now = Date.now();

  if (buckets.size > 5_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size > 5_000) buckets.clear();
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: 0,
  };
}

/** Optional global daily cap to protect the account balance. 0 = disabled. */
export function checkDailyLimit(limit: number): {
  ok: boolean;
  remaining: number;
} {
  if (limit <= 0) return { ok: true, remaining: -1 };

  const today = new Date().toISOString().slice(0, 10);
  if (daily.day !== today) {
    daily.day = today;
    daily.count = 0;
  }

  if (daily.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  daily.count += 1;
  return { ok: true, remaining: Math.max(0, limit - daily.count) };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "local";
}

export function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}
