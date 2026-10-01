"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
// Consent form content and metadata (renamed from consent.tsx to bust a stale dev chunk).
import { ConsentBody, CONSENT_META } from "@/content/consentForm";
import AssignmentChallenge from "@/components/study/AssignmentChallenge";
import { useSmoothScroll } from "@/lib/useSmoothScroll";

export default function ConsentScreen() {
  const { acceptConsent, declineConsent, isAssigning, assignError } = useStudy();
  const [choice, setChoice] = useState<"agree" | "disagree" | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);
  const [showClickPopup, setShowClickPopup] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const clickPopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consentScrollRef = useRef<HTMLDivElement | null>(null);

  // Inertial smooth scrolling for the consent text box.
  useSmoothScroll(consentScrollRef);

  const challengeRequired = process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const challengePassed = !challengeRequired || (challengeReady && Boolean(challengeToken));
  const handleChallenge = useCallback((token: string | null) => setChallengeToken(token), []);
  const handleChallengeReady = useCallback((ready: boolean) => setChallengeReady(ready), []);

  const toggleChoice = useCallback((key: "agree" | "disagree") => {
    setChoice((current) => (current === key ? null : key));
    setChallengeToken(null);
    setChallengeReady(false);
    setShowClickPopup(false);
  }, []);

  const triggerClickPopup = useCallback(() => {
    if (clickPopupTimerRef.current) clearTimeout(clickPopupTimerRef.current);
    setShowClickPopup(true);
    clickPopupTimerRef.current = setTimeout(() => {
      setShowClickPopup(false);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (clickPopupTimerRef.current) clearTimeout(clickPopupTimerRef.current);
    };
  }, []);

  const isBlocked = choice === null || (choice === "agree" && !challengePassed) || isAssigning;
  const popupText =
    choice === null
      ? "Select yes or no before continuing"
      : choice === "agree" && !challengePassed
        ? "Complete the verification box above"
        : null;

  const isPopupVisible = Boolean(popupText && (isHoveringButton || showClickPopup));

  const handleButtonClick = () => {
    if (choice === null) {
      triggerClickPopup();
      return;
    }
    if (choice === "agree") {
      if (!challengePassed) {
        triggerClickPopup();
        return;
      }
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
      hideScrollbar
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
            ref={consentScrollRef}
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
        <div className="w-full min-[1100px]:w-auto min-[1100px]:min-w-0 min-[1100px]:flex-1 max-w-[680px] flex flex-col self-stretch pb-1">
          {/* Key Points Summary Card (fills the empty space beside the consent form) */}
          <div
            className="w-full rounded-xl shadow-sm p-5 mb-4"
            style={{ background: "#ffffff", border: "1.5px solid #64748b" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-4 rounded-full bg-blue-600 flex-shrink-0" />
              <h3 className="font-bold text-[14px] text-slate-900 tracking-tight">
                Key Points at a Glance
              </h3>
            </div>
            <p className="text-[12px] text-slate-600 mb-3">
              A quick summary of the consent form. Please still read the full form on the left before deciding.
            </p>
            <ul className="space-y-2.5 text-[12.5px] text-slate-700">
              {[
                "Takes about 45 minutes, completed entirely online at a time and place of your choosing.",
                "You take a short pre-test, study materials or use the AI visualization tool, then take a post-test and short questionnaire.",
                "Eligibility: 18 or older, currently a Kean University student, and have completed CPS 2231.",
                "Participation is completely voluntary. You may withdraw at any time with no penalty.",
                "Minimal risk. No audio or video recordings are collected.",
                "You are assigned an anonymous participant ID. Data is kept confidential and reported only in aggregate.",
                "No compensation and no financial obligation for taking part.",
                "Your choice will not affect your grades, academic standing, or relationship with Kean University.",
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

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
                  <div
                    key={opt.key}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => toggleChoice(opt.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleChoice(opt.key);
                      }
                    }}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-all shadow-sm w-full select-none"
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
                      readOnly
                      tabIndex={-1}
                      className={`w-4 h-4 flex-shrink-0 pointer-events-none ${isAgree ? "accent-emerald-600" : "accent-red-600"}`}
                    />
                    <span className="text-[12.5px] font-semibold leading-snug">{opt.label}</span>
                  </div>
                );
              })}
            </fieldset>

            {/* Continue Button and Verification Group */}
            <div className="flex flex-col items-start gap-2.5 flex-shrink-0 self-end pb-0.5 ml-2">
              {/* Cloudflare Verification Widget placed ABOVE Continue button */}
              {choice === "agree" && (
                <div className="flex-shrink-0 mb-1">
                  <AssignmentChallenge
                    onToken={handleChallenge}
                    onReadyChange={handleChallengeReady}
                  />
                </div>
              )}

              {assignError && (
                <span className="text-[12px]" style={{ color: "var(--danger)" }}>
                  {assignError}
                </span>
              )}

              {/* Continue Button with Pop-up Message */}
              <div
                className="relative inline-flex flex-col items-center"
                onMouseEnter={() => setIsHoveringButton(true)}
                onMouseLeave={() => setIsHoveringButton(false)}
              >
                {/* Pop-up Message on hover or click */}
                {isPopupVisible && (
                  <div
                    role="tooltip"
                    className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-150 ease-out"
                  >
                    <div className="bg-slate-900 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
                      <span className="text-amber-400">⚠️</span>
                      <span>{popupText}</span>
                    </div>
                    <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900 mx-auto" />
                  </div>
                )}

                <button
                  type="button"
                  className="btn-primary text-xs py-2.5 px-6 shadow-lg transition-opacity"
                  aria-disabled={isBlocked}
                  style={{
                    opacity: isBlocked ? 0.6 : 1,
                    cursor: isBlocked ? "not-allowed" : "pointer",
                  }}
                  onClick={handleButtonClick}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudyShell>
  );
}
