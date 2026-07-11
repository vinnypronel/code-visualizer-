"use client";

/*
 * Final handoff. Shows the participant ID prominently and links out to the
 * external Microsoft Forms questionnaire, with the instruction to enter the ID.
 * Logs questionnaire_shown once when reached.
 */

import { useEffect } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { MSFORMS_URL } from "@/lib/studyConfig";

export default function HandoffScreen() {
  const { session, logEvent } = useStudy();
  const participantId = session.participantId ?? "----";

  useEffect(() => {
    void logEvent("questionnaire_shown");
  }, [logEvent]);

  return (
    <StudyShell
      stageIndex={4}
      heading="Post-session questionnaire"
      subheading="Thank you. Please complete the questionnaire to finish the study."
    >
      <div
        className="rounded-xl p-6 mb-6 text-center"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Write down your participant ID
        </p>
        <p
          className="font-mono font-bold mb-1"
          style={{ fontSize: 40, letterSpacing: "2px", color: "var(--accent)" }}
        >
          {participantId}
        </p>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Please enter your participant ID {participantId} when prompted in the
          questionnaire.
        </p>
      </div>

      <div className="flex justify-center">
        {MSFORMS_URL ? (
          <a
            className="btn-primary"
            href={MSFORMS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the questionnaire
          </a>
        ) : (
          <span
            className="text-[12px] font-mono px-3 py-2 rounded-md"
            style={{
              background: "#f59e0b14",
              border: "1px solid #f59e0b44",
              color: "var(--warning)",
            }}
          >
            Questionnaire link not set. Define NEXT_PUBLIC_MSFORMS_URL.
          </span>
        )}
      </div>
    </StudyShell>
  );
}
