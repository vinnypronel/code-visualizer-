/*
 * Server-only Supabase access.
 *
 * We talk to Supabase's PostgREST endpoint directly with fetch rather than
 * pulling in the @supabase/supabase-js client, because the harness needs only
 * two operations (call an RPC, patch a row). The service-role key is read here
 * and MUST stay server-side: this module is imported only by route handlers.
 *
 * Env (server-only, no NEXT_PUBLIC_ prefix):
 *   SUPABASE_URL                - e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   - service role key (bypasses RLS)
 */

function getConfig(): { url: string; key: string } {
  if (typeof window !== "undefined") {
    throw new Error("supabaseServer must never be imported on the client");
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local (see .env.example).",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

function baseHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/*
 * Call a Postgres function exposed through PostgREST. Returns the parsed JSON
 * result (functions returning a table come back as an array of rows).
 */
export async function callRpc<T>(
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: baseHeaders(key),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`RPC ${fn} failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

/*
 * Patch a single session row, matched by participant_id. Values for jsonb
 * columns may be plain objects. Uses Prefer: return=minimal to avoid echoing
 * the row back.
 */
export async function patchSession(
  participantId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { url, key } = getConfig();
  const query = `participant_id=eq.${encodeURIComponent(participantId)}`;
  const res = await fetch(`${url}/rest/v1/sessions?${query}`, {
    method: "PATCH",
    headers: { ...baseHeaders(key), Prefer: "return=minimal" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Session patch failed (${res.status}): ${detail}`);
  }
}
