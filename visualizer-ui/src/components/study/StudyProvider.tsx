"use client";

/*
 * StudyProvider holds the whole participant session in memory as a single
 * client-side state machine. Keeping this in React state (rather than routed
 * pages) means the participant ID, condition, timers, and captured responses
 * are never lost to a navigation. Writes that must be durable are POSTed to the
 * server route handlers, which own the authoritative timestamps.
 *
 * Every lifecycle write is retried and then placed in a localStorage outbox.
 * Each write has a stable event ID, so retrying cannot duplicate data.
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
  Condition,
  LogEvent,
  LogRequestBody,
  Phase,
  SessionState,
  TestResponses,
} from "@/lib/studyTypes";
import UnsavedResponsesNotice from "./UnsavedResponsesNotice";

/*
 * One queued POST body plus the bookkeeping the outbox needs. `critical` is
 * decided once at enqueue time from the payload, so a reload can restore the
 * warning state without re-inspecting payload shapes.
 */
interface OutboxItem {
  id: string;
  critical: boolean;
  body: LogRequestBody;
}

const OUTBOX_KEY = "study.outbox.v2";
const SESSION_KEY = "study.session.v3";
const LEGACY_SESSION_KEYS = ["study.session.v1", "study.session.v2"];
const FORCE_NEW_PARAM = "new_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

interface StudyContextValue {
  session: SessionState;
  assignError: string | null;
  isAssigning: boolean;
  /*
   * True only while an event carrying the participant's answers is still
   * unsaved. Ordinary timestamp events never set this.
   */
  unsavedCritical: boolean;
  /* Last-resort recovery: save the unsent queue to a JSON file. */
  downloadUnsavedResponses: () => void;
  /* Consent accepted: mint the participant ID on the server, then advance. */
  acceptConsent: (turnstileToken?: string) => Promise<void>;
  /* Consent declined: terminal, no ID minted, nothing logged. */
  declineConsent: () => void;
  /* Move the machine to a specific phase. */
  goTo: (phase: Phase) => void;
  /* End the current local session and return to a fresh consent form. */
  returnToConsent: () => void;
  /*
   * Dev-only escape hatch: jump straight to any phase (optionally forcing a
   * condition) without going through consent or minting a participant ID.
   * Never called from participant-facing UI; see DevJumpBar.
   */
  devJump: (phase: Phase, condition?: Condition) => void;
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
  /* Set the active lesson ID chosen during the learning phase. */
  setSelectedLessonId: (lessonId: string) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

const INITIAL_SESSION: SessionState = {
  participantId: null,
  sessionToken: null,
  assignmentRequestId: null,
  seq: null,
  condition: null,
  phase: "consent",
  selectedLessonId: null,
  pretestResponses: {},
  posttestResponses: {},
};

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(
    () => readStoredSession() ?? INITIAL_SESSION,
  );
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>(readOutbox);
  const [isFlushing, setIsFlushing] = useState(false);
  const assignmentChallengeRef = useRef<string | null>(null);

  const sessionRef = useLatestRef(session);
  const outboxRef = useLatestRef(outbox);

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  const declineConsent = useCallback(() => {
    setSession((s) => ({ ...s, phase: "declined" }));
  }, []);

  const acceptConsent = useCallback(async (turnstileToken?: string) => {
    if (turnstileToken) assignmentChallengeRef.current = turnstileToken;
    const assignmentRequestId = sessionRef.current.assignmentRequestId ?? makeUuid();
    const sessionToken = sessionRef.current.sessionToken ?? makeUuid();
    setIsAssigning(true);
    setAssignError(null);
    setSession((s) => ({
      ...s,
      phase: "assigned",
      assignmentRequestId,
      sessionToken,
    }));

    try {
      const res = await fetch("/api/session/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_request_id: assignmentRequestId,
          session_token: sessionToken,
          turnstile_token: assignmentChallengeRef.current,
        }),
      });
      if (!res.ok) {
        throw new Error(`assign failed with status ${res.status}`);
      }
      const data = (await res.json()) as AssignResponse;
      setSession((s) => ({
        ...s,
        participantId: data.participant_id,
        sessionToken: data.session_token,
        assignmentRequestId,
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
  }, [sessionRef]);

  const goTo = useCallback((phase: Phase) => {
    setSession((s) => ({ ...s, phase }));
  }, []);

  const setSelectedLessonId = useCallback((lessonId: string) => {
    setSession((s) => ({ ...s, selectedLessonId: lessonId }));
  }, []);

  const devJump = useCallback((phase: Phase, condition?: Condition) => {
    setSession((s) => ({
      ...s,
      phase,
      condition: condition ?? s.condition ?? "ai",
      participantId: s.participantId ?? "P000",
      sessionToken: s.sessionToken,
      assignmentRequestId: s.assignmentRequestId,
    }));
  }, []);

  const returnToConsent = useCallback(() => {
    setSession(INITIAL_SESSION);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_KEY);
      LEGACY_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }
  }, []);

  const flushOutbox = useCallback(async () => {
    if (isFlushing || outboxRef.current.length === 0) return;
    setIsFlushing(true);
    try {
      const current = [...outboxRef.current];
      const remaining: OutboxItem[] = [];

      for (const item of current) {
        const ok = await postLogWithRetry(item.body);
        if (!ok) {
          remaining.push(item);
        }
      }

      setOutbox(remaining);
      writeOutbox(remaining);
    } finally {
      setIsFlushing(false);
    }
  }, [isFlushing, outboxRef]);

  useEffect(() => {
    if (outbox.length > 0) {
      void flushOutbox();
    }
  }, [outbox.length, flushOutbox]);

  const logEvent = useCallback(
    async (event: LogEvent, payload?: LogRequestBody["payload"]) => {
      const currentSession = sessionRef.current;
      const pid = currentSession.participantId;
      const token = currentSession.sessionToken;
      if (!pid || !token) return;

      const body: LogRequestBody = {
        participant_id: pid,
        session_token: token,
        event_id: makeUuid(),
        event,
        clientTimestamp: new Date().toISOString(),
        payload,
      };

      const critical = event !== "example_attempted";
      const ok = await postLogWithRetry(body);
      if (!ok) {
        const item: OutboxItem = {
          id: makeOutboxId(),
          critical,
          body,
        };
        setOutbox((prev) => {
          const next = [...prev, item];
          writeOutbox(next);
          return next;
        });
      }
    },
    [sessionRef],
  );

  const unsavedCritical = useMemo(
    () => outbox.some((item) => item.critical),
    [outbox],
  );

  const downloadUnsavedResponses = useCallback(() => {
    const file = {
      exportedAt: new Date().toISOString(),
      participant_id: sessionRef.current.participantId,
      condition: sessionRef.current.condition,
      outbox: outboxRef.current,
      session: sessionRef.current,
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unsaved-responses-${file.participant_id ?? "unknown"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [outboxRef, sessionRef]);

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
      unsavedCritical,
      downloadUnsavedResponses,
      acceptConsent,
      declineConsent,
      goTo,
      returnToConsent,
      devJump,
      logEvent,
      setResponse,
      setSelectedLessonId,
    }),
    [
      session,
      assignError,
      isAssigning,
      unsavedCritical,
      downloadUnsavedResponses,
      acceptConsent,
      declineConsent,
      goTo,
      returnToConsent,
      devJump,
      logEvent,
      setResponse,
      setSelectedLessonId,
    ],
  );

  return (
    <StudyContext.Provider value={value}>
      {children}
      <UnsavedResponsesNotice />
    </StudyContext.Provider>
  );
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error("useStudy must be used within a StudyProvider");
  }
  return ctx;
}

async function postLog(body: LogRequestBody): Promise<boolean> {
  try {
    const res = await fetch("/api/session/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function postLogWithRetry(body: LogRequestBody): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (await postLog(body)) return true;
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeOutboxId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeUuid(): string {
  return crypto.randomUUID();
}

function readStoredSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    if (new URLSearchParams(window.location.search).has(FORCE_NEW_PARAM)) {
      window.sessionStorage.removeItem(SESSION_KEY);
      LEGACY_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
      return null;
    }

    /* sessionStorage isolates simultaneous study tabs. localStorage caused a
     * second participant in the same browser profile to reuse the first
     * participant's ID and token. It still survives ordinary page reloads. */
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { savedAt?: number; session?: SessionState };
    const savedAt = parsed?.savedAt ?? 0;
    const session = parsed?.session;

    if (
      !session?.participantId ||
      !session.sessionToken ||
      !session.assignmentRequestId ||
      Date.now() - savedAt > SESSION_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function writeStoredSession(session: SessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ savedAt: Date.now(), session }),
    );
  } catch {
    // ignore storage quota errors
  }
}

function readOutbox(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OutboxItem[];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
