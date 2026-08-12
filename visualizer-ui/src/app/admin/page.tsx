/*
 * Researcher dashboard route.
 *
 * Guarded server-side: an unauthenticated request is redirected to the login
 * page before any query runs, so session rows never leave the server without a
 * valid cookie. The Supabase read also happens here, keeping the service-role
 * key out of the client bundle.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { selectAllSessions } from "@/lib/supabaseServer";
import type { SessionRow } from "@/lib/adminMetrics";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Dashboard - UR2PhD Research Tool",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  let rows: SessionRow[] = [];
  let error: string | null = null;
  try {
    rows = await selectAllSessions<SessionRow>();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load session data.";
  }

  return (
    <AdminDashboard rows={rows} fetchedAt={new Date().toISOString()} error={error} />
  );
}
