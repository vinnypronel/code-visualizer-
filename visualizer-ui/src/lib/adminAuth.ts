/*
 * Admin authentication for the researcher dashboard.
 *
 * Deliberately minimal: this guards a single-researcher view over study data,
 * so there is no user table and no password database. One credential pair lives
 * in server-only env vars and the browser gets an HttpOnly, signed, expiring
 * cookie. Nothing about the admin identity is ever exposed to client code.
 *
 * Env (server-only, no NEXT_PUBLIC_ prefix):
 *   ADMIN_EMAIL           - the single address allowed to sign in
 *   ADMIN_PASSWORD        - its password
 *   ADMIN_SESSION_SECRET  - random string used to sign the session cookie
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

/* How long a signed-in session lasts before the cookie stops verifying. */
const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface AdminConfig {
  email: string;
  password: string;
  secret: string;
}

/*
 * Reads the credential env vars. Throws with an actionable message rather than
 * silently letting anyone in, so a misconfigured deploy fails closed.
 */
function getConfig(): AdminConfig {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!email || !password || !secret) {
    throw new Error(
      "Missing ADMIN_EMAIL, ADMIN_PASSWORD or ADMIN_SESSION_SECRET. Set them in .env.local (see .env.example).",
    );
  }
  return { email, password, secret };
}

/* Constant-time string compare that does not leak length through timing. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/* Verifies a submitted credential pair. Email match is case-insensitive. */
export function verifyCredentials(email: string, password: string): boolean {
  const cfg = getConfig();
  const emailOk = safeEqual(email.trim().toLowerCase(), cfg.email.trim().toLowerCase());
  const passwordOk = safeEqual(password, cfg.password);
  return emailOk && passwordOk;
}

/*
 * Builds the cookie value: "<expiry>.<nonce>.<hmac>". The nonce means two
 * sign-ins in the same second do not produce an identical token.
 */
export function createSessionToken(): { value: string; maxAge: number } {
  const { secret } = getConfig();
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(12).toString("base64url");
  const payload = `${expires}.${nonce}`;
  return { value: `${payload}.${sign(payload, secret)}`, maxAge: SESSION_TTL_SECONDS };
}

/* True when the token is well-formed, correctly signed, and unexpired. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  let secret: string;
  try {
    secret = getConfig().secret;
  } catch {
    return false;
  }
  if (!safeEqual(signature, sign(`${expires}.${nonce}`, secret))) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Math.floor(Date.now() / 1000);
}

/* Server-component helper: is the current request signed in? */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}
