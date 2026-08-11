"use client";

import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";

/* Shows the freshly minted participant ID with skeleton loading during server assignment. */
export default function AssignedScreen() {
  const { session, isAssigning, assignError, goTo } = useStudy();
  const isLoading = isAssigning || !session.participantId;

  return (
    <StudyShell
      stageIndex={1}
      heading={isLoading ? "Generating your Participant ID" : "Your Participant ID"}
      subheading={
        isLoading
          ? "Please wait a moment while we assign your unique study session..."
          : "Please write this down. You will need it for the questionnaire at the end."
      }
      footer={
        <button
          className="btn-primary min-w-[180px] justify-center text-xs py-2.5 px-6"
          disabled={isLoading}
          style={{
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          onClick={() => goTo("pretest")}
        >
          {isLoading ? "Assigning ID..." : "Continue to the pre-test"}
        </button>
      }
    >
      <div
        className="rounded-xl p-8 text-center max-w-2xl mx-auto shadow-sm"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] uppercase tracking-wider mb-3 font-mono font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          Participant ID
        </p>

        {isLoading ? (
          /* Skeleton Loader shown instantly on page 2 while PID is being assigned */
          <div className="flex flex-col items-center justify-center py-3">
            <div className="h-16 w-64 rounded-xl bg-slate-800/40 border border-slate-700/40 animate-pulse flex items-center justify-center mb-4">
              <span className="text-slate-400 font-mono text-sm tracking-widest animate-pulse font-semibold">
                GENERATING...
              </span>
            </div>
            <div className="h-4 w-5/6 rounded bg-slate-800/30 animate-pulse mt-3" />
            <div className="h-4 w-3/4 rounded bg-slate-800/30 animate-pulse mt-2" />
          </div>
        ) : (
          <>
            <p
              className="font-mono font-bold"
              style={{ fontSize: 44, letterSpacing: "2px", color: "var(--accent)" }}
            >
              {session.participantId}
            </p>
            <p className="text-[13px] mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Your answers in this app are recorded under this ID automatically. The
              short questionnaire at the very end is hosted outside this app, and it
              will ask you to type this ID in, so keep it somewhere handy. It is also
              shown again on the final screen.
            </p>
          </>
        )}

        {assignError && (
          <p className="text-[12px] mt-4 font-semibold" style={{ color: "var(--danger)" }}>
            {assignError}
          </p>
        )}
      </div>
    </StudyShell>
  );
}
