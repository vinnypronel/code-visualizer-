/*
 * 404, written for a study participant rather than for a developer.
 *
 * The only page that exists is "/", so anyone landing here has a typo in the
 * link or a stale bookmark. Two things matter: they must not think they broke
 * the study or lost their answers, and they must have one obvious way back.
 * Because the session is stored in the browser, returning to the study picks up
 * exactly where they left off, which is worth saying out loud so nobody starts
 * over and mints a second participant ID.
 *
 * No mention of error codes, no stack trace, no jargon.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="w-full max-w-md text-center">
        <p
          className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Code Visualizer Study
        </p>

        <h1 className="mb-3 text-2xl font-bold">This page does not exist</h1>

        <p
          className="mb-8 text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          The address may have been mistyped, or a link may be out of date.
          Nothing has gone wrong with your session and none of your answers have
          been lost.
        </p>

        <Link className="btn-primary" href="/">
          Return to the study
        </Link>

        <p
          className="mt-8 text-[12px] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          If you were part way through and this keeps happening, contact{" "}
          <a href="mailto:yama@kean.edu" style={{ color: "var(--accent)" }}>
            yama@kean.edu
          </a>
          .
        </p>
      </div>
    </main>
  );
}
