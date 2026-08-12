const JSON_TYPE = "application/json";

export function noStoreHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store, max-age=0");
  return headers;
}

export function acceptsJsonBody(request: Request, maxBytes: number): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes(JSON_TYPE)) return false;

  const rawLength = request.headers.get("content-length");
  if (!rawLength) return true;
  const length = Number(rawLength);
  return Number.isFinite(length) && length >= 0 && length <= maxBytes;
}

/**
 * Browser defense-in-depth for state-changing endpoints. Origin headers are
 * spoofable by non-browser clients, so this complements rather than replaces
 * authentication, Turnstile, or an edge rate limit.
 */
export function isSameOriginMutation(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
