"use client";

import { useEffect, useState } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { BackButtonWithTooltip } from "@/components/study/screens/TimedTestScreen";

/* Typewriter text animation component anchored left-to-right */
function TypewriterText({
  text,
  speed = 28,
  delay = 200,
}: {
  text: string;
  speed?: number;
  delay?: number;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);

    let timeoutId: NodeJS.Timeout;
    let index = 0;

    const typeNextChar = () => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        const char = text[index - 1];
        index++;
        // Human typing cadence: pause slightly at periods/commas
        const pause = char === "." || char === "," ? 160 : Math.floor(Math.random() * 15);
        timeoutId = setTimeout(typeNextChar, speed + pause);
      } else {
        setIsTyping(false);
      }
    };

    const startTimeout = setTimeout(typeNextChar, delay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeoutId);
    };
  }, [text, speed, delay]);

  return (
    <span className="inline-block text-left font-medium">
      {displayedText}
      {isTyping && (
        <span className="inline-block w-[2px] h-[1.1em] bg-emerald-600 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

/* Shows the freshly minted participant ID centered on screen with typewriter text effect. */
export default function AssignedScreen() {
  const { session, isAssigning, assignError, goTo, acceptConsent, returnToConsent } = useStudy();
  const isLoading = isAssigning || !session.participantId;

  return (
    <StudyShell
      stageIndex={1}
      heading=""
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <BackButtonWithTooltip
            label="Back to Consent Form"
            onClick={returnToConsent}
            tooltipText="Going back to the Consent Form will reset your assigned Participant ID."
          />
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
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] py-4 text-center">
        {/* Big Centered Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
          {isLoading ? "Generating your Participant ID" : "Your Participant ID"}
        </h1>

        {/* Subheading with Typewriter Effect */}
        <p className="text-sm sm:text-base max-w-xl mb-8 leading-relaxed min-h-[1.75rem]" style={{ color: "var(--text-secondary)" }}>
          {isLoading ? (
            "Please wait a moment while we assign your unique study session..."
          ) : (
            <TypewriterText text="Please write this down. You will need it for the questionnaire at the end." speed={30} />
          )}
        </p>

        {/* Centered PID Card Box */}
        <div
          className="rounded-xl p-8 sm:p-10 text-center w-full max-w-xl shadow-md border"
          style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3 font-mono font-bold"
            style={{ color: "var(--text-muted)" }}
          >
            Participant ID
          </p>

          {isLoading ? (
            /* Skeleton Loader shown instantly on page 2 while PID is being assigned */
            <div className="flex flex-col items-center justify-center py-4">
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
                className="font-mono font-extrabold my-2"
                style={{ fontSize: 56, letterSpacing: "3px", color: "var(--accent)" }}
              >
                {session.participantId}
              </p>
              <p className="text-[13px] mt-4 leading-relaxed max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Your answers in this app are recorded under this ID automatically. The
                short questionnaire at the very end is hosted outside this app, and it
                will ask you to type this ID in, so keep it somewhere handy. It is also
                shown again on the final screen.
              </p>
            </>
          )}

          {assignError && (
            <div className="mt-5 text-center">
              <p className="text-[13px] font-semibold" style={{ color: "var(--danger)" }}>
                We could not start your session.
              </p>
              <p
                className="text-[12px] mt-1 mx-auto max-w-md leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                This is usually a temporary connection problem. Select Try again.
                If it keeps failing, please tell the researcher and do not close
                this page.
              </p>
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => void acceptConsent()}
                disabled={isAssigning}
                style={{ opacity: isAssigning ? 0.6 : 1 }}
              >
                {isAssigning ? "Trying..." : "Try again"}
              </button>
              <p className="text-[10px] mt-3 font-mono" style={{ color: "var(--text-muted)" }}>
                {assignError}
              </p>
            </div>
          )}
        </div>
      </div>
    </StudyShell>
  );
}
