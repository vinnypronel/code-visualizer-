-- Adds in-app questionnaire storage to an existing study harness database.
--
-- Run this manually in the Supabase SQL editor if 0001_study_harness.sql was
-- already applied before the questionnaire was moved into the site.

alter table public.sessions
  add column if not exists questionnaire_finished_at timestamptz,
  add column if not exists questionnaire_responses jsonb;
