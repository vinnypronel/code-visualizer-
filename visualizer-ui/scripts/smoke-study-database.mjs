import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

function loadEnvFile(path) {
  try {
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] ??= value;
    }
  } catch {
    // Deployment shells may provide variables directly.
  }
}

loadEnvFile(".env.local");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.STUDY_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
if (!supabaseUrl || !serviceKey) throw new Error("Supabase environment variables are missing.");

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};
let participantId = null;
let blockNumber = null;

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${url}: ${text.slice(0, 300)}`);
  return parsed;
}

async function logEvent(sessionToken, event, payload = {}, eventId = randomUUID()) {
  await requestJson(`${appUrl}/api/session/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: participantId,
      session_token: sessionToken,
      event_id: eventId,
      event,
      clientTimestamp: new Date().toISOString(),
      payload,
    }),
  });
  return eventId;
}

try {
  const existingSessions = await requestJson(
    `${supabaseUrl}/rest/v1/sessions?select=participant_id&limit=1`,
    { headers: serviceHeaders },
  );
  if (existingSessions.length > 0) {
    throw new Error("Refusing the write smoke test because participant rows already exist. Use npm run db:check during data collection.");
  }

  const assignmentRequestId = randomUUID();
  const sessionToken = randomUUID();
  const assignmentBody = JSON.stringify({
    assignment_request_id: assignmentRequestId,
    session_token: sessionToken,
  });
  const assignment = await requestJson(`${appUrl}/api/session/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: assignmentBody,
  });
  const repeatedAssignment = await requestJson(`${appUrl}/api/session/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: assignmentBody,
  });
  if (assignment.participant_id !== repeatedAssignment.participant_id) {
    throw new Error("Assignment retry created a duplicate participant.");
  }
  participantId = assignment.participant_id;
  blockNumber = Math.floor((assignment.seq - 1) / 2) + 1;

  await logEvent(sessionToken, "pretest_started");
  await logEvent(sessionToken, "pretest_finished", {
    ended_by: "manual", elapsed_seconds: 42,
    responses: { "q1.output.line1": "Rex, 3" },
  });
  await logEvent(sessionToken, "learning_started");
  await logEvent(sessionToken, "example_attempted", { example_id: "linkedlist" });
  await logEvent(sessionToken, "learning_completed", { example_id: "linkedlist", elapsed_seconds: 75 });
  await logEvent(sessionToken, "learning_continue", { elapsed_seconds: 80 });
  await logEvent(sessionToken, "posttest_started");
  await logEvent(sessionToken, "posttest_finished", {
    ended_by: "timer", elapsed_seconds: 55,
    responses: { "q1.output.line1": "Python, 250" },
  });
  await logEvent(sessionToken, "questionnaire_shown");
  const openedEventId = await logEvent(sessionToken, "questionnaire_opened");
  await logEvent(sessionToken, "questionnaire_opened", {}, openedEventId);

  await requestJson(`${supabaseUrl}/rest/v1/rpc/mark_questionnaire_finished_admin`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({
      p_participant_id: participantId,
      p_finished_at: new Date().toISOString(),
    }),
  });

  const rows = await requestJson(
    `${supabaseUrl}/rest/v1/sessions?participant_id=eq.${participantId}&select=pretest_elapsed_seconds,learning_elapsed_seconds,posttest_elapsed_seconds,measured_lesson_id,questionnaire_opened_at,questionnaire_finished_at,pretest_responses,posttest_responses`,
    { headers: serviceHeaders },
  );
  if (rows.length !== 1) throw new Error("Smoke-test session row is missing.");
  const row = rows[0];
  if (
    row.pretest_elapsed_seconds !== 42 ||
    row.learning_elapsed_seconds !== 75 ||
    row.posttest_elapsed_seconds !== 55 ||
    row.measured_lesson_id !== "linkedlist" ||
    !row.questionnaire_opened_at ||
    !row.questionnaire_finished_at ||
    row.pretest_responses?.["q1.output.line1"] !== "Rex, 3" ||
    row.posttest_responses?.["q1.output.line1"] !== "Python, 250"
  ) throw new Error("Saved summary fields do not match the smoke-test events.");

  const events = await requestJson(
    `${supabaseUrl}/rest/v1/study_events?participant_id=eq.${participantId}&select=event_id,event_type`,
    { headers: serviceHeaders },
  );
  if (events.length !== 11) throw new Error(`Expected 11 unique audit events, found ${events.length}.`);
  console.log(`PASS: full study persistence and retry safety worked for temporary ${participantId}.`);
} finally {
  if (participantId) {
    await requestJson(`${supabaseUrl}/rest/v1/sessions?participant_id=eq.${participantId}`, {
      method: "DELETE", headers: serviceHeaders,
    });
  }
  if (blockNumber != null) {
    await requestJson(`${supabaseUrl}/rest/v1/assignment_blocks?block_number=eq.${blockNumber}`, {
      method: "DELETE", headers: serviceHeaders,
    });
  }
  console.log("Temporary smoke-test session and events removed. The participant sequence may have advanced.");
}
