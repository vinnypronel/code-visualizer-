"use client";

/*
 * Runtime error boundary for anything thrown while a participant is inside the
 * study.
 *
 * This is the highest stakes screen in the app, because it can appear midway
 * through a timed test. Three things it must do:
 *
 *   1. Offer "Try again" first. Next.js `reset()` re-renders the failed subtree
 *      without a full reload, so an intermittent failure costs nothing.
 *   2. Say plainly that their answers are not gone. They are not: the session
 *      is mirrored to browser storage and unsent responses sit in an outbox
 *      that retries, so a reload resumes the same participant ID.
 *   3. Never show the raw error to the participant. The digest is kept in small
 *      print because it is the only thing that lets a researcher identify what
 *      happened afterwards.
 *
 * Deliberately no dependency on StudyProvider: this can render when the tree
 * below the provider has already failed.
 */

import { useEffect } from "react";
import Image from "next/image";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server logs are where a researcher can actually go looking later.
    console.error("Study runtime error:", error);
  }, [error]);

  return (
    <main
      className="flex flex-1 items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="study-error-content w-full max-w-lg text-center flex flex-col items-center">
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

        <h1 className="mb-3 text-2xl font-bold">Something went wrong</h1>

        <p
          className="mb-8 text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Your answers so far have been saved and your participant ID is
          unchanged. Select Try again to continue from where you were. If that
          does not work, reloading this page will resume the same session.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn-primary" onClick={reset}>
            <span>Try again</span>
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
          </button>
          <button
            type="button"
            className="text-[13px] px-4 py-2 rounded-md border"
            style={{
              background: "var(--bg-panel-2)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
            onClick={() => window.location.reload()}
          >
            Reload the page
          </button>
        </div>

        <p
          className="mt-8 text-[12px] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          If this keeps happening, please tell the researcher rather than
          starting over, so your session is not counted twice. Contact{" "}
          <a href="mailto:yama@kean.edu" style={{ color: "var(--accent)" }}>
            yama@kean.edu
          </a>
          .
        </p>

        {error.digest && (
          <p
            className="mt-4 font-mono text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
