"use client";

/*
 * StudyProvider holds the whole participant session in memory as a single
 * client-side state machine. Keeping this in React state (rather than routed
 * pages) means the participant ID, condition, timers, and captured responses
 * are never lost to a navigation. Writes that must be durable are POSTed to the
 * server route handlers, which own the authoritative timestamps.
 *
 * Logging is not uniformly disposable. Most events are plain timestamps, but
 * `pretest_finished` and `posttest_finished` carry the participant's actual
 * answers, which are the study's primary data. A silently dropped POST there
 * loses a whole 45-minute session with nobody noticing, so those go through a
 * retry, then a localStorage outbox that survives a reload, and only then does
 * the participant see a notice. Ordinary timestamp failures stay invisible.
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

const OUTBOX_KEY = "study.outbox.v1";
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
  acceptConsent: () => Promise<void>;
  /* Consent declined: terminal, no ID minted, nothing logged. */
  declineConsent: () => void;
  /* Move the machine to a specific phase. */
  goTo: (phase: Phase) => void;
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

/*
 * Session persistence.
 *
 * Without this, the whole session lives in React memory, so a refresh, an
 * accidental tab close, or a browser restart drops the participant back on the
 * consent form with no ID. Consenting a second time mints a SECOND participant
 * ID through the atomic sequence, which splits one person's data across two
 * rows and is invisible at analysis time. Restoring instead puts them back
 * exactly where they were, with the same ID.
 *
 * Only sessions that have an ID are stored, so nothing is written before
 * consent. Restoring happens in an effect after mount rather than in the
 * initial state, so the server and the first client render agree.
 */
const SESSION_KEY = "study.session.v1";

/*
 * A stored session is abandoned after this long. It bounds the damage when a
 * shared lab machine moves from one participant to the next: a stale session
 * cannot silently attach a new person's answers to yesterday's ID.
 */
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/* Escape hatch for a shared machine: /?new=1 always starts a clean session. */
const FORCE_NEW_PARAM = "new";

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // A ref that always holds the latest session, so logEvent can read the
  // participant ID without being re-created on every state change.
  const sessionRef = useLatestRef(session);

  /*
   * Restore a session left behind by a refresh or a closed tab. Runs once,
   * after mount, so there is no hydration mismatch. A stored session only
   * exists once an ID has been minted, so this can never resurrect a
   * half-finished consent form.
   */
  useEffect(() => {
    const stored = readStoredSession();
    // Setting state from an effect is exactly right here: localStorage cannot
    // be read during render without the server and client disagreeing, so the
    // first paint has to be the pristine session and the restore has to land
    // immediately after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSession(stored);
  }, []);

  /*
   * Mirror the session to storage whenever it changes, but only once it has an
   * ID worth restoring. Writing before consent would persist nothing useful and
   * would make a fresh visit look like a resumed one.
   */
  useEffect(() => {
    if (!session.participantId) return;
    writeStoredSession(session);
  }, [session]);

  const goTo = useCallback((phase: Phase) => {
    setSession((s) => ({ ...s, phase }));
  }, []);

  const devJump = useCallback((phase: Phase, condition?: Condition) => {
    setSession((s) => ({
      ...s,
      phase,
      condition: condition ?? s.condition ?? "ai",
    }));
  }, []);

  const declineConsent = useCallback(() => {
    setSession((s) => ({ ...s, phase: "declined" }));
  }, []);

  const acceptConsent = useCallback(async () => {
    setIsAssigning(true);
    setAssignError(null);
    // Instant transition: move to page 2 (assigned) immediately so the user sees skeleton loaders right away
    setSession((s) => ({
      ...s,
      phase: "assigned",
    }));

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

  const [unsavedCritical, setUnsavedCritical] = useState(false);

  // Guards against two flushes racing and sending the same item twice.
  const isFlushingRef = useRef(false);

  const syncUnsavedFlag = useCallback(() => {
    setUnsavedCritical(readOutbox().some((item) => item.critical));
  }, []);

  /*
   * Drain the outbox oldest-first. Order matters: a later event for the same
   * participant can overwrite the same columns, so a replay must not run
   * backwards. One failure stops the drain and leaves the rest queued.
   */
  const flushOutbox = useCallback(async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    try {
      let queue = readOutbox();
      while (queue.length > 0) {
        const [next] = queue;
        const sent = await postLog(next.body);
        if (!sent) break;
        // Re-read before removing: a log that failed while we were awaiting
        // may have appended to the stored queue in the meantime.
        queue = readOutbox().filter((item) => item.id !== next.id);
        writeOutbox(queue);
      }
    } finally {
      isFlushingRef.current = false;
      syncUnsavedFlag();
    }
  }, [syncUnsavedFlag]);

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

      /*
       * Deliberately not awaited. The participant must never wait on a backoff,
       * so the caller resolves immediately and delivery continues in the
       * background.
       */
      void (async () => {
        const sent = await postLogWithRetry(body);
        if (sent) {
          // A working connection is the cheapest moment to retry old items.
          await flushOutbox();
          return;
        }
        const critical = Boolean(body.payload?.responses);
        writeOutbox([
          ...readOutbox(),
          { id: makeOutboxId(), critical, body },
        ]);
        syncUnsavedFlag();
      })();
    },
    [sessionRef, flushOutbox, syncUnsavedFlag],
  );

  /*
   * Pick up anything a previous page load left behind, and retry whenever the
   * browser reports the connection is back.
   */
  useEffect(() => {
    void flushOutbox();
    const onOnline = () => {
      void flushOutbox();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushOutbox]);

  const downloadUnsavedResponses = useCallback(() => {
    const queue = readOutbox();
    if (queue.length === 0) return;
    const file = {
      participant_id:
        sessionRef.current?.participantId ??
        queue[0]?.body.participant_id ??
        null,
      exported_at: new Date().toISOString(),
      unsent_events: queue.map((item) => item.body),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `unsaved-responses-${file.participant_id ?? "unknown"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessionRef]);

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
      devJump,
      logEvent,
      setResponse,
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
      devJump,
      logEvent,
      setResponse,
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

/*
 * One POST attempt. Returns false for both a thrown network error and a
 * non-2xx response, since a 500 loses the answers just as completely.
 */
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

/*
 * Retry with exponential backoff. Replays are safe because the server route
 * PATCHes columns keyed by participant_id, so a duplicate rewrites the same
 * values.
 */
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

/*
 * Session storage helpers. Guarded the same way as the outbox, since this
 * module is also evaluated during server rendering. A malformed or expired
 * entry is treated as absent and cleared, so a bad value can never wedge a
 * participant on a screen they cannot leave.
 */
function readStoredSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    // A researcher resetting a shared machine between participants.
    if (new URLSearchParams(window.location.search).has(FORCE_NEW_PARAM)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { savedAt?: number; session?: SessionState };
    const savedAt = parsed?.savedAt ?? 0;
    const session = parsed?.session;

    if (!session?.participantId || Date.now() - savedAt > SESSION_MAX_AGE_MS) {
      window.localStorage.removeItem(SESSION_KEY);
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
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ savedAt: Date.now(), session }),
    );
  } catch {
    // Storage can be full or blocked. Losing persistence is survivable; the
    // in-memory session still carries the participant through in one sitting.
  }
}

/*
 * The outbox lives in localStorage so a reload, a crash, or a closed laptop
 * does not take the answers with it. All access is guarded because this module
 * is also evaluated during server rendering.
 */
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
    // A full or blocked storage leaves the in-memory warning as the only
    // signal, which is still better than failing silently.
  }
}

/* Small helper: a ref that always holds the latest value. */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
