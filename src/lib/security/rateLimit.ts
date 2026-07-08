// Minimal in-memory rate limiting hook. This protects a single server
// instance; production deployments behind multiple instances should back
// this with Redis (see docs/environment.md for the REDIS_URL follow-up).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window-ish fixed-window limiter. `key` should combine the route and
 * an identifier such as IP address or email so limits are scoped correctly.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Derives the client IP for rate-limiting purposes.
 *
 * `x-forwarded-for` is a client-controlled header: anyone can send an
 * arbitrary value, so naively trusting the left-most entry (as many
 * implementations do) lets an attacker mint a fresh identity on every
 * request and bypass IP-based limits entirely.
 *
 * Instead we take the right-most entry, which is appended by our own
 * trusted proxy/load balancer and cannot be forged by the client (proxies
 * append the connecting peer's address; they don't preserve attacker input
 * there). `x-real-ip` is also set by our proxy and used as a fallback for
 * setups that don't populate XFF.
 */
export function clientIpFromRequest(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
