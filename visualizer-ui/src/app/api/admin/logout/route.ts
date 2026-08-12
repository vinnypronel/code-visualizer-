/* POST /api/admin/logout - clears the researcher session cookie. */

import { ADMIN_COOKIE } from "@/lib/adminAuth";
import { isSameOriginMutation, noStoreHeaders } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request not allowed." }, { status: 403, headers: noStoreHeaders() });
  }
  const response = Response.json({ ok: true }, { headers: noStoreHeaders() });
  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_COOKIE}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=0",
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ].filter(Boolean).join("; "),
  );
  return response;
}
