/*
 * Failed-login rate limiting for the admin route.
 *
 * Five failures from one IP inside the window locks that IP out for the
 * cooldown. A successful sign-in clears the record immediately, so a researcher
 * who fat-fingers the password twice and then gets it right is never held back.
 *
 * SCOPE, read before trusting this: the counter lives in module memory. That is
 * per server instance, so on a serverless host each cold start begins with an
 * empty table and a determined attacker gets more than five tries by spreading
 * them across instances. It still turns an unattended million-guess brute force
 * into something that cannot run at speed, which is the attack that actually
 * matters here. If this app ever holds data worth a targeted attempt, move the
 * store to a Supabase table keyed by IP so the limit survives cold starts, and
 * put the platform's own protection in front of the route.
 */

export const MAX_FAILURES = 5;

/* Failures older than this stop counting toward the limit. */
const WINDOW_MS = 15 * 60 * 1000;

/* How long an IP stays locked out once it trips the limit. */
const LOCKOUT_MS = 15 * 60 * 1000;

interface Record {
  /* Timestamps of recent failures, oldest first. */
  failures: number[];
  lockedUntil: number;
}

const attempts = new Map<string, Record>();

/*
 * Drops records that can no longer affect a decision. Called on every check so
 * the map cannot grow without bound from scattered one-off attempts.
 */
function prune(now: number): void {
  for (const [ip, record] of attempts) {
    const stale =
      record.lockedUntil <= now &&
      record.failures.every((t) => now - t > WINDOW_MS);
    if (stale) attempts.delete(ip);
  }
}

/*
 * Best-effort client IP.
 *
 * x-forwarded-for is set by the proxy in front of the app and is trivially
 * spoofable when there is no such proxy, so this is a speed bump against
 * automated guessing rather than an identity. Requests with no usable header
 * share the "unknown" bucket, which means they also share one budget.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateLimitStatus {
  allowed: boolean;
  /* Seconds until the lockout expires. Zero when allowed. */
  retryAfterSeconds: number;
  /* Tries left before this IP locks out. */
  remaining: number;
}

/* Checks an IP without recording anything. Call before verifying credentials. */
export function checkRateLimit(ip: string): RateLimitStatus {
  const now = Date.now();
  prune(now);
  const record = attempts.get(ip);
  if (!record) return { allowed: true, retryAfterSeconds: 0, remaining: MAX_FAILURES };

  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  const recent = record.failures.filter((t) => now - t <= WINDOW_MS);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(MAX_FAILURES - recent.length, 0),
  };
}

/* Records a failed attempt and reports the state after it. */
export function recordFailure(ip: string): RateLimitStatus {
  const now = Date.now();
  const record = attempts.get(ip) ?? { failures: [], lockedUntil: 0 };
  const recent = record.failures.filter((t) => now - t <= WINDOW_MS);
  recent.push(now);
  record.failures = recent;

  if (recent.length >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
    record.failures = [];
    attempts.set(ip, record);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
      remaining: 0,
    };
  }

  attempts.set(ip, record);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: MAX_FAILURES - recent.length,
  };
}

/* Clears an IP's history. Called on a successful sign-in. */
export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

/* Human-readable cooldown, used in the message shown to a locked-out client. */
export function formatCooldown(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}
