/*
 * POST /api/admin/login
 *
 * Checks the submitted credentials against the server-only env pair and, on a
 * match, sets the signed HttpOnly session cookie. Failures return the same
 * generic message regardless of whether the email or the password was wrong.
 *
 * Five failures from one IP lock it out for the cooldown, which is what stops
 * an unattended script from walking the whole password space. See
 * lib/rateLimit.ts for what that limit does and does not cover.
 */

import { ADMIN_COOKIE, createSessionToken, verifyCredentials } from "@/lib/adminAuth";
import {
  checkRateLimit,
  clearAttempts,
  clientIp,
  formatCooldown,
  recordFailure,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/* 429 carries Retry-After so a well-behaved client knows when to come back. */
function lockedOutResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      error: `Too many failed attempts. Try again in ${formatCooldown(retryAfterSeconds)}.`,
      retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  // Check before doing any work, so a locked-out client cannot use the login
  // handler as an oracle or burn server time.
  const limit = checkRateLimit(ip);
  if (!limit.allowed) return lockedOutResponse(limit.retryAfterSeconds);

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  let ok = false;
  try {
    ok = verifyCredentials(email, password);
  } catch (err) {
    // A misconfigured server is not the client's failed attempt, so this path
    // deliberately does not count against the limit.
    const message = err instanceof Error ? err.message : "Admin login is not configured.";
    return Response.json({ error: message }, { status: 500 });
  }

  if (!ok) {
    const after = recordFailure(ip);
    if (!after.allowed) return lockedOutResponse(after.retryAfterSeconds);
    const tries = after.remaining === 1 ? "1 attempt" : `${after.remaining} attempts`;
    return Response.json(
      { error: `Incorrect email or password. ${tries} remaining.`, remaining: after.remaining },
      { status: 401 },
    );
  }

  clearAttempts(ip);

  const { value, maxAge } = createSessionToken();
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_COOKIE}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return response;
}
