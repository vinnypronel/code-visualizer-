import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/adminMetrics.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const metricsModule = new Module("adminMetrics-fixture");
metricsModule.paths = Module._nodeModulePaths(process.cwd());
metricsModule._compile(compiled, "adminMetrics.ts");
const metrics = metricsModule.exports;

function session(participantId, condition, pretestResponses, posttestResponses, extra = {}) {
  return {
    participant_id: participantId,
    seq: Number(participantId.slice(1)),
    condition,
    consent_completed_at: "2026-01-01T00:00:00Z",
    pretest_started_at: null,
    pretest_finished_at: null,
    pretest_ended_by: null,
    pretest_elapsed_seconds: null,
    learning_started_at: null,
    learning_completed_at: null,
    learning_continue_at: null,
    learning_elapsed_seconds: null,
    measured_lesson_id: null,
    posttest_started_at: null,
    posttest_finished_at: null,
    posttest_ended_by: null,
    posttest_elapsed_seconds: null,
    questionnaire_shown_at: null,
    questionnaire_opened_at: null,
    questionnaire_finished_at: null,
    pretest_responses: pretestResponses,
    posttest_responses: posttestResponses,
    examples_tried: [],
    consent_version: null,
    created_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const correctPretest = { ...metrics.PRETEST_KEY };
const correctPosttest = { ...metrics.POSTTEST_KEY };
const views = [
  metrics.toParticipantView(session("P001", "ai", correctPretest, correctPosttest, {
    posttest_started_at: "2026-01-01T00:05:00Z",
    posttest_finished_at: "2026-01-01T00:12:00Z",
  })),
  metrics.toParticipantView(session("P002", "ai", correctPretest, null)),
  metrics.toParticipantView(session("P003", "static", correctPretest, correctPosttest, {
    learning_continue_at: "2026-01-01T00:04:00Z",
  })),
];

const aiSummary = metrics.summarizeCondition(views, "ai");
assert(aiSummary.scoredPairs === 1, "Unpaired participants must not enter the paired sample.");
assert(aiSummary.pretestMean === 100 && aiSummary.posttestMean === 100, "Paired score means must use the same participant cohort.");

const aiFunnel = metrics.funnelCounts(views.filter((view) => view.condition === "ai"));
assert(aiFunnel.find((stage) => stage.stage === "Learning completed").count === 0, "A later post-test event must not imply AI lesson completion.");
assert(aiFunnel.find((stage) => stage.stage === "Post-test started").count === 1, "Actual post-test events must remain visible.");
assert(aiFunnel.at(-1).stage === "Post-test finished", "The study dashboard funnel must end at the post-test.");
assert(views[0].studyMinutes === 12, "Study duration must run from consent through post-test completion.");

const staticFunnel = metrics.funnelCounts(views.filter((view) => view.condition === "static"));
assert(staticFunnel.find((stage) => stage.stage === "Learning completed").count === 1, "Static continue must count as comparable learning completion.");

console.log("Admin metric fixture checks passed.");
