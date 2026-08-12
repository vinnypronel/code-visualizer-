"use client";

/*
 * Credential form for the researcher dashboard. Posts to /api/admin/login,
 * which is what actually checks the credentials and sets the HttpOnly cookie.
 * Nothing here ever sees or stores the expected values.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, LoaderCircle } from "lucide-react";

/* mm:ss for the lockout button label. */
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /* Seconds left on a server-issued lockout. Zero means not locked out. */
  const [cooldown, setCooldown] = useState(0);

  // The server is the authority on the lockout; this countdown only keeps the
  // button disabled and the remaining time honest while it runs down.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; retryAfterSeconds?: number };
      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        if (res.status === 429 && data.retryAfterSeconds) {
          setCooldown(data.retryAfterSeconds);
        }
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors " +
    "focus:border-[var(--border-active)] focus:ring-2 focus:ring-[var(--accent-glow)]";

  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-sm">
        <div
          className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
        >
          <Lock size={20} strokeWidth={2} />
        </div>

        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Researcher sign in
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Study data dashboard. Authorized researchers only.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: "#fdeceb", color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || cooldown > 0}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
            style={{ background: busy ? "var(--action-hover)" : "var(--action)" }}
          >
            {busy && <LoaderCircle size={15} className="animate-spin" />}
            {cooldown > 0
              ? `Locked for ${formatCountdown(cooldown)}`
              : busy
                ? "Signing in"
                : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
