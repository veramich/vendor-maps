// In-memory sliding-window rate limiter.
//
// Tracks recent request timestamps per key (usually an IP) in a module-level
// Map. This is intentionally dependency-free: it protects the paid HERE proxy
// routes from a script hammering them to run up the API bill, which is the
// real exposure. Trade-offs to keep in mind:
//   - Counters live in this process only. On serverless / multi-instance
//     hosting the limit is effectively per-instance (looser than the number
//     set), and they reset on redeploy. Still stops single-source floods.
//   - If you later need a true global limit, swap the internals of `rateLimit`
//     for a shared store (e.g. Upstash Redis) — callers don't change.

// key -> ascending list of request timestamps (ms) still inside the window.
const hits = new Map<string, number[]>();

// Drop keys that have gone quiet so the Map can't grow unbounded over the
// lifetime of the process. Runs opportunistically on each call.
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
  // At most once per window — cheap amortized cost.
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    const fresh = times.filter((t) => now - t < windowMs);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}

export interface RateLimitResult {
  /** True when the request is within the limit and may proceed. */
  ok: boolean;
  /** Requests still allowed in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window frees up — send as Retry-After when blocked. */
  retryAfter: number;
}

/**
 * Record a hit for `key` and report whether it's allowed.
 *
 * @param key       Identifier to bucket by (e.g. client IP + route).
 * @param limit     Max requests permitted per window.
 * @param windowMs  Window length in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (times.length >= limit) {
    // Window frees up when the oldest hit in it ages out.
    const oldest = times[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    hits.set(key, times);
    return { ok: false, remaining: 0, retryAfter };
  }

  times.push(now);
  hits.set(key, times);
  return { ok: true, remaining: limit - times.length, retryAfter: 0 };
}

/**
 * Best-effort client IP from proxy headers. Behind Vercel/most hosts the real
 * client is the first entry of x-forwarded-for. Falls back to a shared bucket
 * ("unknown") when no header is present, which simply groups those callers
 * together under the same limit. Mirrors the IP handling in the submit route.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
