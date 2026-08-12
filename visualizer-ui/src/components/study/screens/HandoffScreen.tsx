"use client";

/*
 * Final handoff. This is the last screen a participant sees inside the app, so
 * it has to stand on its own: thank them, make clear the session itself is
 * over, show the participant ID prominently, and hand off to the external
 * Microsoft Forms questionnaire with the instruction to enter that ID.
 * Logs questionnaire_shown once when reached.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import {
  DEV_THANK_YOU_EVENT,
  DEV_THANK_YOU_STORAGE_KEY,
  MSFORMS_URL,
  QUESTIONNAIRE_MINUTES,
} from "@/lib/studyConfig";

export default function HandoffScreen() {
  const { session, logEvent, returnToConsent } = useStudy();
  const participantId = session.participantId ?? "----";
  const [copied, setCopied] = useState(false);
  const [questionnaireOpened, setQuestionnaireOpened] = useState(false);

  useEffect(() => {
    void logEvent("questionnaire_shown");
  }, [logEvent]);

  useEffect(() => {
    const showDevThankYou = () => {
      window.sessionStorage.removeItem(DEV_THANK_YOU_STORAGE_KEY);
      setQuestionnaireOpened(true);
    };

    window.addEventListener(DEV_THANK_YOU_EVENT, showDevThankYou);
    if (window.sessionStorage.getItem(DEV_THANK_YOU_STORAGE_KEY) === "1") {
      showDevThankYou();
    }

    return () => window.removeEventListener(DEV_THANK_YOU_EVENT, showDevThankYou);
  }, []);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(participantId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the ID is on screen either way.
    }
  };

  const showThankYouPage = () => {
    window.setTimeout(() => setQuestionnaireOpened(true), 0);
  };

  if (questionnaireOpened) {
    return (
      <StudyShell stageIndex={4} noScroll>
        <div className="mx-auto max-w-xl py-4 text-center">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Thank you for participating
          </h1>
          <p
            className="text-[13.5px] mb-5 font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            The questionnaire is open in another tab.
          </p>

          <CheckCircle2
            aria-hidden="true"
            className="mx-auto mb-4"
            size={40}
            strokeWidth={1.75}
            style={{ color: "var(--success)" }}
          />

          <h2 className="mb-2 text-xl font-bold">
            Your part in the app is finished
          </h2>
          <p
            className="mx-auto mb-6 max-w-lg text-[14px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Your pre-test, learning activity, and post-test have all been
            recorded. One short questionnaire is open in the other tab. Fill it
            in, submit it, and you are completely done.
          </p>

          <div
            className="mb-6 rounded-lg border px-5 py-4"
            style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
          >
            <p
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              The questionnaire will ask for this ID
            </p>
            <p
              className="mb-3 font-mono text-3xl font-bold"
              style={{ color: "var(--accent)", letterSpacing: "2px" }}
            >
              {participantId}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={copyId}
                className="text-[12px] font-mono px-3 py-1 rounded-md border"
                style={{
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {copied ? "Copied" : "Copy ID"}
              </button>
              <button
                type="button"
                onClick={returnToConsent}
                className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-md border"
                style={{
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <ArrowLeft size={13} aria-hidden="true" />
                Back to Home
              </button>
            </div>
          </div>

          <p
            className="mb-6 text-[12.5px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            You can leave this tab open until you have submitted the
            questionnaire, in case you need to check the ID again. After that
            you can close both tabs.
          </p>

          <p
            className="text-[11.5px] leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Thank you for helping with this research. For study questions or
            data-removal requests, contact{" "}
            <a href="mailto:yama@kean.edu" style={{ color: "var(--accent)" }}>
              yama@kean.edu
            </a>
            .
          </p>
        </div>
      </StudyShell>
    );
  }

  return (
    <StudyShell
      stageIndex={4}
      noScroll
      heading="You are done with the session"
      subheading="Thank you for taking part. There is one short step left."
    >
      <div className="flex flex-col max-w-3xl mx-auto my-auto py-2 text-center w-full">
        <p
          className="text-[13px] leading-relaxed mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          You have finished the pre-test, the learning activity, and the post-test.
          Your responses have been recorded. The final step is a short
          questionnaire about your experience, which is hosted outside this app.
          Once you submit it, your participation is complete and you can close this
          page.
        </p>

        {/* Participant ID: the one thing they must carry to the questionnaire. */}
        <div
          className="rounded-xl py-3.5 px-6 mb-4 text-center shadow-sm"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Write down your participant ID
          </p>
          <p
            className="font-mono font-bold mb-1"
            style={{ fontSize: 36, letterSpacing: "2px", color: "var(--accent)" }}
          >
            {participantId}
          </p>
          <p
            className="text-[12px] mb-2.5"
            style={{ color: "var(--text-secondary)" }}
          >
            The questionnaire asks for this ID. It is how your answers are matched
            to this session, and it is the only identifier we store.
          </p>
          <button
            onClick={copyId}
            className="text-[11px] font-mono px-3 py-1 rounded-md"
            style={{
              background: "var(--bg-panel-2)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {copied ? "Copied" : "Copy ID"}
          </button>
        </div>

        {/* What is left, spelled out so nobody stops one step early. */}
        <div
          className="rounded-xl py-3 px-5 mb-4 text-left shadow-sm"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12.5px] font-semibold mb-1.5">Last step</p>
          <ol
            className="text-[12px] leading-snug space-y-1 list-decimal pl-5"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>Open the questionnaire using the button below.</li>
            <li>
              Enter your participant ID{" "}
              <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                {participantId}
              </span>{" "}
              when prompted.
            </li>
            <li>
              Answer the questions and submit. It takes about{" "}
              {QUESTIONNAIRE_MINUTES} minutes.
            </li>
          </ol>
          <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
            The questionnaire opens in a new tab, so this page stays open if you
            need to check your ID again.
          </p>
        </div>

        <div className="flex justify-center mb-4">
          {MSFORMS_URL ? (
            <a
              className="btn-primary text-xs py-2.5 px-6"
              href={MSFORMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={showThankYouPage}
            >
              <span>Open the questionnaire</span>
              <svg
                className="btn-arrow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
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

        <p
          className="text-[11px] text-center leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Thank you for helping with this research. If you have questions about the
          study or want your data removed, contact the researcher at{" "}
          <a
            href="mailto:yama@kean.edu"
            style={{ color: "var(--text-secondary)" }}
          >
            yama@kean.edu
          </a>
          .
        </p>
      </div>
    </StudyShell>
  );
}
