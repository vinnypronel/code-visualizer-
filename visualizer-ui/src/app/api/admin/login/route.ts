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
import { acceptsJsonBody, isSameOriginMutation, noStoreHeaders } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";

/* 429 carries Retry-After so a well-behaved client knows when to come back. */
function lockedOutResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      error: `Too many failed attempts. Try again in ${formatCooldown(retryAfterSeconds)}.`,
      retryAfterSeconds,
    },
    { status: 429, headers: noStoreHeaders({ "Retry-After": String(retryAfterSeconds) }) },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request not allowed." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!acceptsJsonBody(request, 8_192)) {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
  }
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
    return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
  }

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400, headers: noStoreHeaders() });
  }

  let ok = false;
  try {
    ok = verifyCredentials(email, password);
  } catch (err) {
    // A misconfigured server is not the client's failed attempt, so this path
    // deliberately does not count against the limit.
    console.error("Admin authentication configuration error", err);
    return Response.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  if (!ok) {
    const after = recordFailure(ip);
    if (!after.allowed) return lockedOutResponse(after.retryAfterSeconds);
    const tries = after.remaining === 1 ? "1 attempt" : `${after.remaining} attempts`;
    return Response.json(
      { error: `Incorrect email or password. ${tries} remaining.`, remaining: after.remaining },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  clearAttempts(ip);

  const { value, maxAge } = createSessionToken();
  const response = Response.json({ ok: true }, { headers: noStoreHeaders() });
  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_COOKIE}=${value}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${maxAge}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return response;
}
