import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] ??= value;
    }
  } catch {
    // Environment variables may already be provided by the deployment shell.
  }
}

loadEnvFile(".env.local");

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const requiredColumns = [
  "participant_id", "seq", "condition", "consent_completed_at",
  "pretest_started_at", "pretest_finished_at", "pretest_ended_by",
  "pretest_elapsed_seconds", "learning_started_at", "learning_completed_at",
  "learning_continue_at", "learning_elapsed_seconds", "measured_lesson_id",
  "posttest_started_at", "posttest_finished_at", "posttest_ended_by",
  "posttest_elapsed_seconds", "questionnaire_shown_at", "questionnaire_opened_at",
  "questionnaire_finished_at", "pretest_responses", "posttest_responses",
  "examples_tried", "consent_version", "assignment_request_id", "created_at",
];

async function checkRead(path, label) {
  const response = await fetch(`${url}${path}`, { headers });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`${label} (${response.status}): ${detail}`);
  }
  return response;
}

try {
  await checkRead(
    `/rest/v1/sessions?select=${requiredColumns.join(",")}&limit=0`,
    "required session columns are missing",
  );
  await checkRead("/rest/v1/study_events?select=event_id,event_type&limit=0", "study_events is missing");
  await checkRead("/rest/v1/assignment_blocks?select=block_number&limit=0", "assignment_blocks is missing");

  const schemaResponse = await checkRead("/rest/v1/", "PostgREST schema could not be read");
  const schema = await schemaResponse.json();
  const paths = schema.paths ?? {};
  for (const rpc of [
    "assign_participant",
    "record_study_event",
    "mark_questionnaire_finished_admin",
  ]) {
    if (!paths[`/rpc/${rpc}`]) throw new Error(`RPC ${rpc} is missing`);
  }

  const countResponse = await fetch(`${url}/rest/v1/sessions?select=participant_id`, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const countRange = countResponse.headers.get("content-range") ?? "*/unknown";
  const count = countRange.split("/")[1] ?? "unknown";

  console.log("PASS: hosted study database has the required pilot schema and RPCs.");
  console.log(`Existing session rows: ${count}`);
  console.log("No participant or study data was created or changed by this check.");
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  console.error("Apply supabase/migrations/0003_study_integrity.sql, then run npm run db:check again.");
  process.exit(1);
}
