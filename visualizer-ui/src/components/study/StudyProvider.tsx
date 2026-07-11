"use client";

/*
 * StudyProvider holds the whole participant session in memory as a single
 * client-side state machine. Keeping this in React state (rather than routed
 * pages) means the participant ID, condition, timers, and captured responses
 * are never lost to a navigation. Writes that must be durable are POSTed to the
 * server route handlers, which own the authoritative timestamps.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AssignResponse,
  LogEvent,
  LogRequestBody,
  Phase,
  SessionState,
  TestResponses,
} from "@/lib/studyTypes";

interface StudyContextValue {
  session: SessionState;
  assignError: string | null;
  isAssigning: boolean;
  /* Consent accepted: mint the participant ID on the server, then advance. */
  acceptConsent: () => Promise<void>;
  /* Consent declined: terminal, no ID minted, nothing logged. */
  declineConsent: () => void;
  /* Move the machine to a specific phase. */
  goTo: (phase: Phase) => void;
  /* Durable log of a lifecycle event (server stamps the timestamp). */
  logEvent: (
    event: LogEvent,
    payload?: LogRequestBody["payload"],
  ) => Promise<void>;
  /* Update a single captured answer for the given test. */
  setResponse: (
    which: "pretest" | "posttest",
    key: string,
    value: string,
  ) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const INITIAL_SESSION: SessionState = {
  participantId: null,
  seq: null,
  condition: null,
  phase: "consent",
  pretestResponses: {},
  posttestResponses: {},
};

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // A ref that always holds the latest session, so logEvent can read the
  // participant ID without being re-created on every state change.
  const sessionRef = useLatestRef(session);

  const goTo = useCallback((phase: Phase) => {
    setSession((s) => ({ ...s, phase }));
  }, []);

  const declineConsent = useCallback(() => {
    setSession((s) => ({ ...s, phase: "declined" }));
  }, []);

  const acceptConsent = useCallback(async () => {
    setIsAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch("/api/session/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`assign failed with status ${res.status}`);
      }
      const data = (await res.json()) as AssignResponse;
      setSession((s) => ({
        ...s,
        participantId: data.participant_id,
        seq: data.seq,
        condition: data.condition,
        phase: "assigned",
      }));
    } catch (err) {
      setAssignError(
        err instanceof Error
          ? err.message
          : "Could not assign a participant ID. Please tell the researcher.",
      );
    } finally {
      setIsAssigning(false);
    }
  }, []);

  const logEvent = useCallback(
    async (event: LogEvent, payload?: LogRequestBody["payload"]) => {
      const participantId = sessionRef.current?.participantId;
      if (!participantId) return;
      const body: LogRequestBody = {
        participant_id: participantId,
        event,
        clientTimestamp: new Date().toISOString(),
        payload,
      };
      try {
        await fetch("/api/session/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // Logging must never block the participant. Failures are swallowed
        // client-side; the researcher can reconcile from server logs.
      }
    },
    [sessionRef],
  );

  const setResponse = useCallback(
    (which: "pretest" | "posttest", key: string, value: string) => {
      setSession((s) => {
        const field =
          which === "pretest" ? "pretestResponses" : "posttestResponses";
        const next: TestResponses = { ...s[field], [key]: value };
        return { ...s, [field]: next };
      });
    },
    [],
  );

  const value = useMemo<StudyContextValue>(
    () => ({
      session,
      assignError,
      isAssigning,
      acceptConsent,
      declineConsent,
      goTo,
      logEvent,
      setResponse,
    }),
    [
      session,
      assignError,
      isAssigning,
      acceptConsent,
      declineConsent,
      goTo,
      logEvent,
      setResponse,
    ],
  );

  return (
    <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
  );
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error("useStudy must be used within a StudyProvider");
  }
  return ctx;
}

/* Small helper: a ref that always holds the latest value. */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
