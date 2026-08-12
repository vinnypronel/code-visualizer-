"use client";

/*
 * Credential form for the researcher dashboard. Posts to /api/admin/login,
 * which is what actually checks the credentials and sets the HttpOnly cookie.
 * Nothing here ever sees or stores the expected values.
 */

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";

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
    <div className="flex h-full w-full flex-col">
      <header
        className="flex min-h-[68px] flex-shrink-0 items-center justify-between border-b px-6 sm:px-9"
        style={{ background: "var(--bg-header)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/kean-logo.png"
            alt="Kean University"
            width={54}
            height={54}
            className="h-12 w-12 object-contain"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-sm font-extrabold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Code Visualizer Study
            </span>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
              Research dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
            style={{
              background: "var(--bg-panel-2)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Home
          </button>

          <Image
            src="/ur2phd-logo.png"
            alt="UR2PhD Mentoring"
            width={180}
            height={48}
            className="h-11 w-auto object-contain"
            priority
          />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 w-full items-center justify-center overflow-y-auto px-6 py-12">
        <div className="w-full max-w-sm">
        <Image
          src="/icon-on-light.svg"
          alt="Code Visualizer"
          width={56}
          height={56}
          className="mb-5 h-14 w-14 object-contain"
          priority
        />

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
    </div>
  );
}
