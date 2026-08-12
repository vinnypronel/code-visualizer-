const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "study-assignment";

interface TurnstileResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyAssignmentChallenge(
  request: Request,
  token: string,
  idempotencyKey: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }
  if (!token || token.length > 2_048) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        idempotency_key: idempotencyKey,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return false;

    const result = (await response.json()) as TurnstileResult;
    const expectedHostname = new URL(request.headers.get("origin") ?? request.url).hostname;
    return result.success === true &&
      result.action === EXPECTED_ACTION &&
      result.hostname === expectedHostname;
  } finally {
    clearTimeout(timeout);
  }
}
