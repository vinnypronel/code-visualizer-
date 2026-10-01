"use client";

/*
 * A persistent, non-blocking notice shown when important study data is still
 * sitting in the client outbox. It is deliberately not a
 * modal and does not gate navigation: the session should keep running, since
 * the answers are already captured and can still be recovered. It exists so a
 * failure is visible to the participant and to the researcher standing next to
 * them, instead of being discovered weeks later during analysis.
 */

import { useState } from "react";
import { useStudy } from "./StudyProvider";

export default function UnsavedResponsesNotice() {
  const { unsavedCritical, downloadUnsavedResponses } = useStudy();
  const [dismissed, setDismissed] = useState(false);

  if (!unsavedCritical || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[min(30rem,calc(100vw-1.5rem))] border rounded-md px-3 py-2 flex items-start gap-3 shadow-lg"
      style={{
        borderColor: "var(--warning)",
        background: "var(--bg-panel)",
        color: "var(--text-primary)",
      }}
    >
      <p className="text-[12px] leading-snug flex-1">
        Some study data has not been saved yet. Please keep this page open and
        tell the researcher.
      </p>
      <button
        type="button"
        onClick={downloadUnsavedResponses}
        className="flex-shrink-0 text-[11px] font-semibold underline underline-offset-2 whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        Download my responses
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notice"
        className="flex-shrink-0 -mr-0.5 -mt-0.5 p-1 rounded hover:bg-black/5 transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
