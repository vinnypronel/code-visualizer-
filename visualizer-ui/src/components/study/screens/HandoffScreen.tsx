"use client";

/*
 * Final questionnaire screen. Shows the participant ID and captures the final
 * survey responses inside the app, then writes them to the sessions row through
 * the server log route.
 */

import { useEffect, useMemo, useState } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import {
  QUESTIONNAIRE_ITEMS,
  type QuestionnaireItem,
} from "@/data/questionnaire";
import type { LogRequestBody, TestResponses } from "@/lib/studyTypes";

function ScaleField({
  item,
  value,
  onChange,
}: {
  item: Extract<QuestionnaireItem, { kind: "scale" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="my-5">
      <legend className="text-[13px] font-medium mb-3">
        {item.label}
        {item.required && <span style={{ color: "var(--warning)" }}> *</span>}
      </legend>
      <div className="grid gap-2 sm:grid-cols-5">
        {item.options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-[74px] cursor-pointer flex-col justify-between rounded-lg px-3 py-3 text-[12px]"
            style={{
              background:
                value === option.value ? "var(--accent-glow)" : "var(--bg-panel-2)",
              border: `1px solid ${
                value === option.value ? "var(--border-active)" : "var(--border)"
              }`,
              color:
                value === option.value
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
          >
            <input
              type="radio"
              name={item.key}
              value={option.value}
              checked={value === option.value}
              onChange={(event) => onChange(event.target.value)}
              className="mb-2 h-4 w-4"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  item,
  value,
  onChange,
}: {
  item: Extract<QuestionnaireItem, { kind: "text" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block my-5">
      <span className="block text-[13px] font-medium mb-2">
        {item.label}
        {item.required && <span style={{ color: "var(--warning)" }}> *</span>}
      </span>
      <input
        type="text"
        value={value}
        placeholder={item.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
        style={{
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

function SelectField({
  item,
  value,
  onChange,
}: {
  item: Extract<QuestionnaireItem, { kind: "select" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block my-5">
      <span className="block text-[13px] font-medium mb-2">
        {item.label}
        {item.required && <span style={{ color: "var(--warning)" }}> *</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
        style={{
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <option value="">Select one</option>
        {item.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  item,
  value,
  onChange,
}: {
  item: Extract<QuestionnaireItem, { kind: "textarea" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block my-5">
      <span className="block text-[13px] font-medium mb-2">
        {item.label}
        {item.required && <span style={{ color: "var(--warning)" }}> *</span>}
      </span>
      <textarea
        value={value}
        placeholder={item.placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full resize-y rounded-md px-3 py-2 text-[13px] outline-none"
        style={{
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

export default function HandoffScreen() {
  const { session, logEvent } = useStudy();
  const participantId = session.participantId ?? "----";
  const [responses, setResponses] = useState<TestResponses>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void logEvent("questionnaire_shown");
  }, [logEvent]);

  const missingRequired = useMemo(
    () =>
      QUESTIONNAIRE_ITEMS.filter(
        (item) => item.required && !responses[item.key]?.trim(),
      ).map((item) => item.key),
    [responses],
  );

  const setAnswer = (key: string, value: string) => {
    setResponses((current) => ({ ...current, [key]: value }));
  };

  const submitQuestionnaire = async () => {
    if (!session.participantId || missingRequired.length > 0 || submitted) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const body: LogRequestBody = {
      participant_id: session.participantId,
      event: "questionnaire_finished",
      clientTimestamp: new Date().toISOString(),
      payload: { responses },
    };
    try {
      const res = await fetch("/api/session/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`questionnaire submit failed with status ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not save the questionnaire. Please tell the researcher.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudyShell
      stageIndex={4}
      heading={submitted ? "All done" : "Final questionnaire"}
      subheading={
        submitted
          ? "Thank you. Your responses have been saved."
          : "Please answer the short questionnaire to finish the study."
      }
      footer={
        submitted ? (
          <span className="text-[13px]" style={{ color: "var(--success)" }}>
            Saved. You may close this window.
          </span>
        ) : (
          <button
            className="btn-primary"
            disabled={
              isSubmitting || missingRequired.length > 0 || !session.participantId
            }
            onClick={submitQuestionnaire}
          >
            {isSubmitting ? "Saving..." : "Submit questionnaire"}
          </button>
        )
      }
    >
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Participant ID
        </p>
        <p
          className="font-mono font-bold"
          style={{ fontSize: 34, letterSpacing: "2px", color: "var(--accent)" }}
        >
          {participantId}
        </p>
        <p className="text-[13px] mt-2" style={{ color: "var(--text-secondary)" }}>
          Your questionnaire answers will be stored with this participant ID.
        </p>
      </div>

      {submitted ? (
        <div
          className="rounded-xl p-6"
          style={{
            background: "#10b98114",
            border: "1px solid #10b98144",
            color: "var(--text-primary)",
          }}
        >
          <h2 className="text-[16px] font-bold mb-2">Questionnaire saved</h2>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Thank you for participating. You may now close this window.
          </p>
        </div>
      ) : (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitQuestionnaire();
            }}
          >
            {QUESTIONNAIRE_ITEMS.map((item) =>
              item.kind === "scale" ? (
                <ScaleField
                  key={item.key}
                  item={item}
                  value={responses[item.key] ?? ""}
                  onChange={(value) => setAnswer(item.key, value)}
                />
              ) : item.kind === "text" ? (
                <TextField
                  key={item.key}
                  item={item}
                  value={responses[item.key] ?? ""}
                  onChange={(value) => setAnswer(item.key, value)}
                />
              ) : item.kind === "select" ? (
                <SelectField
                  key={item.key}
                  item={item}
                  value={responses[item.key] ?? ""}
                  onChange={(value) => setAnswer(item.key, value)}
                />
              ) : (
                <TextareaField
                  key={item.key}
                  item={item}
                  value={responses[item.key] ?? ""}
                  onChange={(value) => setAnswer(item.key, value)}
                />
              ),
            )}
          </form>

          {missingRequired.length > 0 && (
            <p className="text-[12px] mt-4" style={{ color: "var(--text-muted)" }}>
              Complete the required questions marked with * to submit.
            </p>
          )}
          {submitError && (
            <p className="text-[12px] mt-4" style={{ color: "var(--danger)" }}>
              {submitError}
            </p>
          )}
        </>
      )}
    </StudyShell>
  );
}
