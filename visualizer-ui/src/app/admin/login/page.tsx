/*
 * Researcher sign-in. Already-authenticated visitors are bounced straight to
 * the dashboard so the login form is never a dead end.
 */

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Researcher sign in - Study Dashboard",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icon.svg?v=10", type: "image/svg+xml" },
      { url: "/icon.png?v=10", type: "image/png" },
      { url: "/favicon.ico?v=10" },
    ],
    shortcut: "/icon.svg?v=10",
  },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return <AdminLoginForm />;
}
