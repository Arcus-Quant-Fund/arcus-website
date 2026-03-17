// ─── In-memory rate limiter (shared across API routes) ───────────────────────
// For Vercel serverless: each cold start gets fresh state, so this is
// best-effort. For stricter limiting, use Vercel KV or Upstash Redis.

const store = new Map<string, { count: number; reset: number }>();

/**
 * Check rate limit for a given key (typically IP address).
 * @returns true if request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  key: string,
  { max = 5, windowMs = 60 * 60 * 1000 }: { max?: number; windowMs?: number } = {}
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

/** Get the client IP from a Next.js request (works on Vercel + local). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
