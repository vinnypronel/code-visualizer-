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
import Image from "next/image";

export default function NotFound() {
  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="w-full max-w-md text-center flex flex-col items-center">
        <Image
          src="/icon-on-light.svg"
          alt="Code Visualizer"
          width={56}
          height={56}
          className="mb-4 h-14 w-14 object-contain"
          priority
        />
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
          <span>Return to the study</span>
          <svg
            className="btn-arrow"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
