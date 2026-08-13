"use client";

import { useCallback, useState } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { ConsentBody, CONSENT_META } from "@/content/consent";
import AssignmentChallenge from "@/components/study/AssignmentChallenge";

export default function ConsentScreen() {
  const { acceptConsent, declineConsent, isAssigning, assignError } = useStudy();
  const [choice, setChoice] = useState<"agree" | "disagree" | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);
  const challengeRequired = process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const challengePassed = !challengeRequired || (challengeReady && Boolean(challengeToken));
  const handleChallenge = useCallback((token: string | null) => setChallengeToken(token), []);
  const handleChallengeReady = useCallback((ready: boolean) => setChallengeReady(ready), []);

  const continueBlockedReason =
    choice === null
      ? "Select an option above to continue."
      : choice === "agree" && !challengePassed
        ? "Complete the verification box to continue."
        : null;

  const onContinue = () => {
    if (choice === "agree") {
      if (!challengePassed) return;
      void acceptConsent(challengeToken ?? undefined);
    } else if (choice === "disagree") {
      declineConsent();
    }
  };

  return (
    <StudyShell
      stageIndex={0}
      heading={CONSENT_META.title}
      subheading="Please read the following before deciding whether to take part."
    >
      {/*
        Keep the desktop arrangement on laptop-sized viewports, including when
        browser zoom reduces the CSS viewport. Between 1100px and the full
        desktop width, both columns flex smaller instead of stacking or
        pushing the Continue button off-screen.
      */}
      <div className="flex flex-col min-[1100px]:flex-row items-start gap-5 w-full max-w-[1360px]">
        {/* Scrollable Consent Form Text Box */}
        <div
          className="w-full min-[1100px]:w-[clamp(470px,42vw,560px)] max-w-[560px] rounded-xl overflow-hidden shadow-sm flex-shrink-0"
          style={{
            background: "#ffffff",
            border: "1.5px solid #64748b",
          }}
        >
          <div
            className="p-5 overflow-y-auto panel-scroll
              h-[min(590px,calc(100dvh-165px))]
              min-[1600px]:h-[min(590px,calc(100dvh/1.12-165px))]
              min-[1800px]:h-[min(590px,calc(100dvh/1.25-165px))]
              min-[2200px]:h-[min(590px,calc(100dvh/1.4-165px))]
              min-[2800px]:h-[min(590px,calc(100dvh/1.6-165px))]"
          >
            <ConsentBody />
          </div>
        </div>

        {/* Agreement Question & Continue Group Moved Left Next to Consent Box */}
        <div className="w-full min-[1100px]:w-auto min-[1100px]:min-w-0 min-[1100px]:flex-1 max-w-[680px] flex flex-col justify-end self-stretch pb-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-start gap-4 w-full mt-auto">
            {/* Agreement Question & Option Boxes */}
            <fieldset className="space-y-2.5 w-full max-w-[440px] min-w-0">
              <legend className="text-[14px] font-extrabold mb-2" style={{ color: "#0f172a" }}>
                Do you agree to participate in this study?
              </legend>
              {(
                [
                  {
                    key: "agree",
                    label:
                      "Yes, I agree - I have read and understood the information above and I voluntarily agree to participate.",
                  },
                  {
                    key: "disagree",
                    label:
                      "No, I do not agree - I do not wish to participate and will not be able to proceed with the study.",
                  },
                ] as const
              ).map((opt) => {
                const isSelected = choice === opt.key;
                const isAgree = opt.key === "agree";
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-all shadow-sm w-full"
                    style={{
                      background: isSelected
                        ? isAgree
                          ? "#ecfdf5"
                          : "#fef2f2"
                        : "#ffffff",
                      border: isSelected
                        ? isAgree
                          ? "2px solid #059669"
                          : "2px solid #dc2626"
                        : "1.5px solid #64748b",
                      color: isSelected
                        ? isAgree
                          ? "#047857"
                          : "#b91c1c"
                        : "#0f172a",
                    }}
                  >
                    <input
                      type="radio"
                      name="consent"
                      value={opt.key}
                      checked={isSelected}
                      onChange={() => {
                        setChoice(opt.key);
                        setChallengeToken(null);
                        setChallengeReady(false);
                      }}
                      className={`w-4 h-4 flex-shrink-0 ${isAgree ? "accent-emerald-600" : "accent-red-600"}`}
                    />
                    <span className="text-[12.5px] font-semibold leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </fieldset>

            {/* Continue Button Joined Right Next to Options */}
            <div className="flex flex-col items-start gap-2 flex-shrink-0 self-end pb-0.5 ml-2">
              {/*
                A greyed-out Continue with no explanation left participants
                stuck, especially since the verification box only appears once
                "Yes" is chosen. This says what is still outstanding.
              */}
              {continueBlockedReason && (
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {continueBlockedReason}
                </span>
              )}
              {assignError && (
                <span className="text-[12px]" style={{ color: "var(--danger)" }}>
                  {assignError}
                </span>
              )}
              <button
                className="btn-primary text-xs py-2.5 px-6 shadow-lg"
                disabled={choice === null || isAssigning || (choice === "agree" && !challengePassed)}
                style={{
                  opacity: choice === null || isAssigning || (choice === "agree" && !challengePassed) ? 0.5 : 1,
                  cursor: choice === null || isAssigning || (choice === "agree" && !challengePassed) ? "not-allowed" : "pointer",
                }}
                onClick={onContinue}
              >
                <span>{isAssigning ? "Please wait..." : "Continue"}</span>
                {!isAssigning && (
                  <svg
                    className="btn-arrow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </button>
              {/*
                Rendered directly, with no animated wrapper. A collapsing slot
                was tried here and broke consent in production: Turnstile
                refuses to render into a clipped, zero-height container, so the
                widget never appeared and nobody could get past this screen.
                The skeleton inside the component covers the loading gap.
              */}
              {choice === "agree" && (
                <AssignmentChallenge
                  onToken={handleChallenge}
                  onReadyChange={handleChallengeReady}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </StudyShell>
  );
}
