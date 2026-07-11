-- Study harness schema: sessions table plus an atomic participant-ID minting RPC.
--
-- Apply this MANUALLY against the Supabase project (SQL editor or CLI). It is
-- not run automatically by the app. Review before applying.
--
-- Design notes:
--   * IDs are minted from a Postgres sequence. nextval() is atomic, so two
--     participants consenting at the same moment can never receive the same ID.
--   * All writes happen server-side with the service-role key, which bypasses
--     RLS. RLS is enabled with NO policies, so the anon and authenticated roles
--     (anything reachable from a browser) are denied all access to the table.

-- 1. Sequence backing the participant counter.
create sequence if not exists public.participant_seq start with 1;

-- 2. Sessions table. One row per consented participant.
create table if not exists public.sessions (
  participant_id          text primary key,          -- e.g. "P001"
  seq                     integer not null unique,    -- 1, 2, 3, ...
  condition               text not null check (condition in ('ai', 'static')),
  consent_completed_at    timestamptz,
  pretest_started_at      timestamptz,
  pretest_finished_at     timestamptz,
  pretest_ended_by        text check (pretest_ended_by in ('timer', 'manual')),
  learning_started_at     timestamptz,
  learning_continue_at    timestamptz,
  posttest_started_at     timestamptz,
  posttest_finished_at    timestamptz,
  posttest_ended_by       text check (posttest_ended_by in ('timer', 'manual')),
  questionnaire_shown_at    timestamptz,
  questionnaire_finished_at timestamptz,
  pretest_responses         jsonb,
  posttest_responses        jsonb,
  questionnaire_responses   jsonb,
  created_at                timestamptz not null default now()
);

-- 3. Atomic mint + row creation. Called only by the server (assign handler).
--    Returns the new participant_id, seq, and assigned condition.
--    p_randomize mirrors the app's RAND_LEARNING_TOOL flag:
--      true  -> odd seq gets 'ai', even seq gets 'static'
--      false -> always 'ai'
create or replace function public.assign_participant(p_randomize boolean)
returns table (participant_id text, seq integer, condition text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq       integer;
  v_id        text;
  v_condition text;
begin
  v_seq := nextval('public.participant_seq');
  v_id  := 'P' || lpad(v_seq::text, 3, '0');

  if p_randomize then
    v_condition := case when v_seq % 2 = 1 then 'ai' else 'static' end;
  else
    v_condition := 'ai';
  end if;

  insert into public.sessions (participant_id, seq, condition, consent_completed_at)
  values (v_id, v_seq, v_condition, now());

  return query select v_id, v_seq, v_condition;
end;
$$;

-- 4. Row Level Security: deny everything to client-facing roles.
--    With RLS enabled and no policies, anon/authenticated can do nothing.
--    The service_role key used by the server bypasses RLS entirely.
alter table public.sessions enable row level security;

-- 5. Lock down the RPC so it cannot be executed from the browser.
revoke all on function public.assign_participant(boolean) from public;
revoke all on function public.assign_participant(boolean) from anon;
revoke all on function public.assign_participant(boolean) from authenticated;
grant execute on function public.assign_participant(boolean) to service_role;
