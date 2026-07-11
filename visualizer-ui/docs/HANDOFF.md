# Study Harness Handoff

Pick-up document for a fresh session (human or AI) continuing the study-harness
work on the Code Visualizer app. No em dashes and no emojis are used anywhere in
this repo, per the project owner's rules. Keep it that way.

## 1. What this project is

A UR2PhD summer research study at Kean University (student Vinny, partner Kiana,
mentor Dr. Yan Ma). The app visualizes Java program execution step by step. The
research question compares two ways of learning the same concepts: an AI-assisted
interactive visualizer vs static reading materials.

This task built the **study harness** that wraps the existing visualizer so real
participants can be run: consent, participant ID assignment, a timed pre-test, a
learning phase in one of two conditions, a timed post-test, and a hand-off to an
external questionnaire, with everything logged to a database.

The Java tracer prototypes at the repository root (`parser-spike/`,
`java-jail-spike/`, `java-trace-spike/`) are unrelated research spikes. Do not
touch them. The app lives entirely in `visualizer-ui/`.

## 2. Current status

- Git branch: `study-harness` (branched from `main`).
- Working tree: has an uncommitted `docs/HANDOFF.md` (this file) at time of
  writing. Everything else is committed. Nothing has been pushed.
- Commit sequence on the branch:
  1. `baseline before study harness`
  2. Extract visualizer into `VisualizerExperience`; move types to `src/types`
  3. Add study config flags, session types, and `StudyProvider`
  4. Add server route handlers and Supabase migration for session logging
  5. Add study shell chrome, timestamp timers, consent content and screens
  6. Wire full study flow: tests, learning, handoff, phase machine, gate

### Verified

- `npx tsc --noEmit` passes.
- `npx eslint` passes on all new files (the pre-existing setState-in-effect
  lint errors inside the moved visualizer are unchanged and out of scope).
- `npx next build` passes; both API routes register as dynamic.
- Browser check: the consent screen renders with the 5-stage stepper, and the
  phase state machine advances (choosing "No" moves to the declined screen).

### Not verified

- The agree path (consent through hand-off) has not been run live because it
  needs a real Supabase project and credentials, which do not exist yet.

## 3. Settled decisions (do not re-litigate without reason)

1. **Wrap, do not rewrite.** The working mock visualizer was moved verbatim via
   `git mv` from `src/app/page.tsx` into
   `src/components/visualizer/VisualizerExperience.tsx`. Its internals are
   unchanged. The study flow wraps it.
2. **One client-side phase state machine**, not routed steps. All session state
   lives in a React context (`StudyProvider`) so nothing is lost on transitions.
3. **Writes go through the server.** The browser never holds DB keys. Two App
   Router route handlers own the service-role key and stamp authoritative
   timestamps.
4. **Dependency-free Supabase access.** The server talks to Supabase PostgREST
   with plain `fetch` (RPC + PATCH). No `@supabase/supabase-js` was added.
5. **Timestamp-based timers.** Countdown and count-up derive from a stored start
   time and `Date.now()` deltas, so backgrounding a tab does not corrupt timing.
6. **Types moved, preset data did not.** The shared visualizer type definitions
   moved to `src/types/visualizer.ts`. The ~900 lines of hand-authored preset
   step data stayed inside `VisualizerExperience.tsx` to avoid a risky move.

## 4. Tech stack and constraints

- Next.js 16.2.9, App Router, React 19, TypeScript, Turbopack.
- Next 16 conventions differ from older versions. Read the installed docs at
  `node_modules/next/dist/docs/` before adding routes, layouts, or handlers.
  See also `visualizer-ui/AGENTS.md`.
- Package manager is npm. Not pnpm, not yarn.
- Tailwind v4, CSS-first, no `tailwind.config`. Reuse the CSS variables and
  utility classes in `src/app/globals.css` (for example `var(--bg-panel)`,
  `var(--border)`, `btn-primary`, `badge`).
- Owner rules: no em dashes, no emojis, never push without an explicit
  instruction.

## 5. Config flags

`src/lib/studyConfig.ts`:

- `STUDY_MODE` (currently `true`): `true` shows the full study flow at `/`;
  `false` renders the visualizer alone for dev and demos.
- `RAND_LEARNING_TOOL` (currently `true`): `true` assigns condition by
  participant-ID parity (odd seq gets `ai`, even seq gets `static`); `false`
  gives everyone the AI tool.
- `PRETEST_DURATION_SECONDS`, `POSTTEST_DURATION_SECONDS` (both 600).
- `LEARNING_RECOMMENDED_MINUTES` (15, advisory only, not enforced).
- `conditionForSeq(seq)`: the shared parity rule used by client and server.

## 6. Participant flow (the state machine)

Phases live in `src/lib/studyTypes.ts` as the `Phase` union. The switch that
renders each screen is `src/components/study/StudyFlow.tsx`. Order:

1. `consent` -> `ConsentScreen`. Renders consent, requires agree or disagree.
   Disagree goes to `declined` (terminal, nothing logged, no ID). Agree calls
   `POST /api/session/assign`, which mints the ID, then advances to `assigned`.
2. `assigned` -> `AssignedScreen`. Shows the participant ID, Continue advances
   to `pretest`.
3. `pretest` -> `TimedTestScreen` (pretest). 10 minute countdown, early
   Continue, auto-submit on expiry. Logs `pretest_started` on mount and
   `pretest_finished` (with `ended_by` and responses) on finish. Advances to
   `learning`.
4. `learning` -> `LearningScreen`. Count-up timer. Renders the AI visualizer
   (`VisualizerExperience`) or `StaticMaterialsStub` based on condition, inside
   identical chrome. Manual Continue only. Logs `learning_started` and
   `learning_continue`. Advances to `posttest`.
5. `posttest` -> `TimedTestScreen` (posttest). Same behavior as pre-test with
   post-test content. Advances to `handoff`.
6. `handoff` -> `HandoffScreen`. Shows the participant ID prominently and links
   to the Microsoft Forms questionnaire with the instruction to enter the ID.
   Logs `questionnaire_shown` on mount.

The wrapper chrome (`StudyShell`: header, 5-stage stepper, timer slot, footer)
is identical across both learning conditions by construction. Only the learning
content differs. This protects study validity.

## 7. File map (all under `visualizer-ui/`)

Visualizer (existing, wrapped):
- `src/components/visualizer/VisualizerExperience.tsx` - the moved mock
  visualizer. Contains the `SIMULATION_PRESETS` fixture data and a single AI
  seam, `resolveStepExplanation`, which is where real Gemini explanations will
  plug in later. Currently returns the static preset explanation.
- `src/types/visualizer.ts` - shared visualizer types (moved out of page.tsx).
- `src/components/AiExplanationPanel.tsx`, `CodeEditorPanel.tsx`,
  `MemoryExecutionView.tsx`, `OnboardingTour.tsx`, `TopBar.tsx` - unchanged
  panels, imports repointed to `@/types/visualizer`.

Entry and layout:
- `src/app/page.tsx` - gate: `STUDY_MODE ? <StudyFlow/> : <VisualizerExperience/>`.
- `src/app/layout.tsx` - wraps children in `StudyProvider`.

Study state and flow:
- `src/lib/studyConfig.ts` - flags and condition rule.
- `src/lib/studyTypes.ts` - `Phase`, `Condition`, `SessionState`,
  `AssignResponse`, `LogEvent`, `LogRequestBody`, `TestResponses`, `EndedBy`.
- `src/components/study/StudyProvider.tsx` - context: session state,
  `acceptConsent`, `declineConsent`, `goTo`, `logEvent`, `setResponse`.
- `src/components/study/StudyFlow.tsx` - phase switch.
- `src/components/study/StudyShell.tsx` - shared chrome, `STAGES`, `TimerChip`,
  and a `fluid` mode for the full-bleed learning phase.
- `src/components/study/useTimers.ts` - `useCountdown`, `useCountUp`,
  `formatMMSS`.

Screens (`src/components/study/screens/`):
- `ConsentScreen.tsx`, `DeclinedScreen.tsx`, `AssignedScreen.tsx`,
  `TimedTestScreen.tsx` (reused for pre and post), `LearningScreen.tsx`,
  `HandoffScreen.tsx`.

Learning content:
- `src/components/study/StaticMaterialsStub.tsx` - static reading-materials
  condition covering recursion, tracing, objects, references, and assignment.

Tests and content:
- `src/data/tests.ts` - `PRETEST`, `POSTTEST`, `TEST_INSTRUCTIONS`, and the
  field model (`code`, `text`, `grid` with read-only or input cells).
- `src/components/study/TestRunner.tsx` - renders a `TestDef` as read-only code
  plus editable inputs.
- `src/content/consent.tsx` - consent content transcribed from
  `ConsentForm_CodeViz.docx`. `CONSENT_META` holds the protocol number and
  version line.

Server:
- `src/lib/supabaseServer.ts` - server-only PostgREST helper (`callRpc`,
  `patchSession`). Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `src/app/api/session/assign/route.ts` - `POST`, mints the ID via RPC, returns
  `{ participant_id, seq, condition }`.
- `src/app/api/session/log/route.ts` - `POST`, maps a `LogEvent` to session
  columns and patches the row with a server timestamp.

Database and env:
- `supabase/migrations/0001_study_harness.sql` - sessions table,
  `assign_participant` RPC, RLS deny. Apply manually.
- `.env.example` - variable names only.
- `docs/README.md` - where to drop the real consent document.

## 8. Database

Not created yet. The migration defines:

- `sessions` table, one row per consented participant. Columns: `participant_id`
  (text, e.g. P001), `seq` (int), `condition` (`ai` or `static`),
  `consent_completed_at`, `pretest_started_at`, `pretest_finished_at`,
  `pretest_ended_by`, `learning_started_at`, `learning_continue_at`,
  `posttest_started_at`, `posttest_finished_at`, `posttest_ended_by`,
  `questionnaire_shown_at`, `pretest_responses` (jsonb), `posttest_responses`
  (jsonb), `created_at`.
- `assign_participant(p_randomize boolean)` RPC: atomically takes the next
  sequence value, formats the ID (`P` + zero-padded seq), computes the
  condition, inserts the row with the consent timestamp, and returns the ID,
  seq, and condition. `nextval` is atomic so concurrent participants never
  collide.
- RLS is enabled with no policies, so client-facing roles are denied all
  access. The service-role key used by the server bypasses RLS.

Response JSON uses a shared key scheme across pre and post so analysis is
symmetric: `q1.base_case`, `q1.trace.step1..6`, `q1.base_case_step`,
`q1.final_value`, `q2.table.step2..5.col_a|col_b|col_c`, `q2.output.line1|line2`.
The column (`pretest_responses` vs `posttest_responses`) distinguishes the two,
not the keys.

## 9. Environment variables

In `visualizer-ui/.env.local` (gitignored; template in `.env.example`). Next
loads `.env` from the project root, not from `src/`.

- `SUPABASE_URL` - server only, required to run the flow.
- `SUPABASE_SERVICE_ROLE_KEY` - server only, required. No `NEXT_PUBLIC_` prefix.
- `NEXT_PUBLIC_MSFORMS_URL` - public Microsoft Forms questionnaire URL.

## 10. How to run and verify

From `visualizer-ui/`:

- Install once: `npm install`.
- Dev server: `npm run dev` (http://localhost:3000).
- Typecheck: `npx tsc --noEmit`.
- Lint: `npx eslint src`.
- Build: `npx next build`.

To run the full flow live you must:
1. Create a Supabase project.
2. Run `supabase/migrations/0001_study_harness.sql` in it.
3. Put `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
   `NEXT_PUBLIC_MSFORMS_URL` in `.env.local`.

To demo the visualizer without the study, set `STUDY_MODE = false` in
`src/lib/studyConfig.ts`.

## 11. Open decisions and what is left

Open question raised with the owner and not yet resolved:
- **Keep Supabase or not.** No project exists, so nothing is locked in. The two
  route handlers are the only integration point; they could target Google
  Sheets, Airtable, Firebase, a CSV endpoint, or another Postgres host instead.
  If the decision is to drop the DB, rework `supabaseServer.ts`,
  `api/session/assign`, and `api/session/log`.

Still to do (out of scope for the task as built, left as clean seams):
- Add the real Microsoft Forms questionnaire URL to `.env.local`.
- Real AI (Gemini) explanations. The only seam is `resolveStepExplanation` in
  `VisualizerExperience.tsx`. The participant-facing "Gemini" labeling was left
  unchanged intentionally.
- In-tool activity logging during the learning phase. The hook point is the
  marked `TODO(in-tool-logging)` in `LearningScreen.tsx`.
- Optional cleanup: extract `SIMULATION_PRESETS` and `getWalkthroughMessage`
  from `VisualizerExperience.tsx` into `src/data/`. Skipped deliberately to
  avoid behavior risk; do it in its own commit with a build check if wanted.
- Cleaning up the embedded Java spike repos at the repo root (they show up as
  submodule-like content with no `.gitmodules`). Separate task.

## 12. Known gotchas

- The pre-existing eslint `set-state-in-effect` errors live inside the moved
  visualizer code and were present before this work. They do not block
  `next build` (Next 16 does not run eslint during build). Do not "fix" the
  visualizer internals as part of harness work.
- `AiExplanationPanel.tsx` has a duplicate interface declaration (two
  `AiExplanationPanelProps`). This is a pre-existing quirk; interface merging
  makes `presetId` optional. Harmless, left as is.
- A dev server may already be running on port 3000 from an earlier session.
