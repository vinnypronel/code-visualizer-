"use client";

/*
 * Final handoff. This is the last screen a participant sees inside the app, so
 * it has to stand on its own: thank them, make clear the session itself is
 * over, show the participant ID prominently, and hand off to the external
 * Microsoft Forms questionnaire with the instruction to enter that ID.
 * Logs questionnaire_shown once when reached.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { MSFORMS_URL, QUESTIONNAIRE_MINUTES } from "@/lib/studyConfig";

export default function HandoffScreen() {
  const { session, logEvent } = useStudy();
  const participantId = session.participantId ?? "----";
  const [copied, setCopied] = useState(false);
  const [questionnaireOpened, setQuestionnaireOpened] = useState(false);

  useEffect(() => {
    void logEvent("questionnaire_shown");
  }, [logEvent]);

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
      <StudyShell
        stageIndex={4}
        heading="Thank you for participating"
        subheading="The questionnaire is open in another tab."
      >
        {/*
          No action lives on this screen. The questionnaire is already open in
          another tab, so the only thing this page owes the participant is the
          ID they have to type into it and the reassurance that everything on
          our side is finished.
        */}
        <div className="mx-auto max-w-xl py-6 text-center">
          <CheckCircle2
            aria-hidden="true"
            className="mx-auto mb-5"
            size={44}
            strokeWidth={1.75}
            style={{ color: "var(--success)" }}
          />

          <h2 className="mb-3 text-2xl font-bold">
            Your part in the app is finished
          </h2>
          <p
            className="mx-auto mb-8 max-w-lg text-[15px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Your pre-test, learning activity, and post-test have all been
            recorded. One short questionnaire is open in the other tab. Fill it
            in, submit it, and you are completely done.
          </p>

          {/* The ID is the only thing they still need from this page. */}
          <div
            className="mb-8 rounded-lg border px-5 py-5"
            style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
          >
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              The questionnaire will ask for this ID
            </p>
            <p
              className="mb-3 font-mono text-4xl font-bold"
              style={{ color: "var(--accent)", letterSpacing: "2px" }}
            >
              {participantId}
            </p>
            <button
              type="button"
              onClick={copyId}
              className="text-[12px] font-mono px-3 py-1.5 rounded-md border"
              style={{
                background: "var(--bg-panel-2)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {copied ? "Copied" : "Copy ID"}
            </button>
          </div>

          <p
            className="mb-8 text-[13px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            You can leave this tab open until you have submitted the
            questionnaire, in case you need to check the ID again. After that
            you can close both tabs.
          </p>

          <p
            className="text-[12px] leading-relaxed"
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
      heading="You are done with the session"
      subheading="Thank you for taking part. There is one short step left."
    >
      <p
        className="text-[14px] leading-relaxed mb-6"
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
        <p
          className="text-[13px] mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          The questionnaire asks for this ID. It is how your answers are matched
          to this session, and it is the only identifier we store.
        </p>
        <button
          onClick={copyId}
          className="text-[12px] font-mono px-3 py-1.5 rounded-md"
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
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <p className="text-[13px] font-semibold mb-3">Last step</p>
        <ol
          className="text-[13px] leading-relaxed space-y-2 list-decimal pl-5"
          style={{ color: "var(--text-secondary)" }}
        >
          <li>Open the questionnaire using the button below.</li>
          <li>
            Enter your participant ID{" "}
            <span className="font-mono" style={{ color: "var(--text-primary)" }}>
              {participantId}
            </span>{" "}
            when prompted.
          </li>
          <li>
            Answer the questions and submit. It takes about{" "}
            {QUESTIONNAIRE_MINUTES} minutes.
          </li>
        </ol>
        <p className="text-[12px] mt-3" style={{ color: "var(--text-muted)" }}>
          The questionnaire opens in a new tab, so this page stays open if you
          need to check your ID again.
        </p>
      </div>

      <div className="flex justify-center">
        {MSFORMS_URL ? (
          <a
            className="btn-primary inline-flex items-center gap-2"
            href={MSFORMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={showThankYouPage}
          >
            Open the questionnaire
            <ExternalLink size={15} aria-hidden="true" />
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
        className="text-[12px] text-center mt-6 leading-relaxed"
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
    </StudyShell>
  );
}
