# Pilot database runbook

The application is ready to collect pilot data only after migration
`supabase/migrations/0003_study_integrity.sql` is applied to the hosted
Supabase project.

## One-time schema upgrade

Use either the Supabase SQL Editor or an authenticated Supabase CLI. Apply the
entire migration as one script. Do this before sharing the participant URL.

Then run:

```powershell
npm run db:check
```

The command is read-only. It checks the required columns, event table,
assignment table, and database functions without creating a participant.

Before enrollment begins, and only while the database has zero participant
rows, use `npm run db:smoke` for a full write/read/retry test. It refuses to run
after participant data exists. It creates an explicitly temporary participant,
validates the complete persistence path, and removes that participant and its
events in a `finally` cleanup. It can advance the numeric sequence; ID gaps do
not affect analysis. During data collection, use only the read-only
`npm run db:check` command.

## What is captured

- anonymous participant ID and randomized learning condition
- consent version and server timestamp
- pre-test and post-test answers, scores derivable from those answers, elapsed
  time, and whether the timer or participant ended each test
- learning start, selected measured lesson, every example opened, lesson
  completion, continue time, and elapsed learning time
- questionnaire page shown, external form opened, and confirmed submission
- immutable event history with both server and client timestamps

Session and event writes have private per-session tokens. Assignment requests
and event writes are idempotent, so network retries do not create duplicate
participants or duplicate events.

## External questionnaire reconciliation

Microsoft Forms must require the participant ID shown by the app. After Forms
responses are received, open `/admin`, select the matching participant, and use
**Mark questionnaire submitted**. This records completion in both the session
summary and the event audit trail. Never mark it submitted merely because the
participant opened the external form.

## Pilot smoke test

1. Open the deployed participant site in a private browser window.
2. Consent and write down the assigned participant ID.
3. Submit the pre-test, complete the assigned learning activity, and submit the
   post-test.
4. Open the questionnaire and submit a test Forms response with the same ID.
5. In `/admin`, confirm answers, elapsed times, condition, measured lesson, and
   questionnaire-opened status.
6. Mark the matching Forms response submitted and confirm the dashboard changes
   to submitted.
7. Export CSV and confirm both raw response JSON columns are present.
8. Remove or explicitly label this smoke-test record before analysis.

## Before each pilot session

- `npm run db:check` passes.
- Production has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_MSFORMS_URL`, and all three `ADMIN_*` variables.
- The Forms URL opens and the form requires participant ID.
- The production page has no Dev Jump controls.
- The researcher can sign in to `/admin` and export CSV.
