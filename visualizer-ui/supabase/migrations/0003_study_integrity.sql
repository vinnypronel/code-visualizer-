-- Study-integrity upgrade. Apply after 0001 and 0002, before enrolling new
-- participants. Existing pilot sessions do not have a session token and should
-- be treated as test data after this migration.

create extension if not exists pgcrypto;

alter table public.sessions
  add column if not exists learning_completed_at timestamptz,
  add column if not exists questionnaire_opened_at timestamptz,
  add column if not exists questionnaire_finished_at timestamptz,
  add column if not exists pretest_elapsed_seconds integer check (pretest_elapsed_seconds >= 0),
  add column if not exists learning_elapsed_seconds integer check (learning_elapsed_seconds >= 0),
  add column if not exists posttest_elapsed_seconds integer check (posttest_elapsed_seconds >= 0),
  add column if not exists measured_lesson_id text
    check (measured_lesson_id in ('linkedlist', 'arraylist', 'stack', 'livetrace')),
  add column if not exists consent_version text,
  add column if not exists assignment_request_id uuid unique,
  add column if not exists session_token_hash text;

-- Randomized blocks of two keep condition counts balanced without making the
-- next condition predictable from an odd/even participant ID.
create table if not exists public.assignment_blocks (
  block_number integer primary key,
  ai_on_odd boolean not null,
  created_at timestamptz not null default now()
);

alter table public.assignment_blocks enable row level security;

-- One immutable row per event. Response JSON remains only in sessions to avoid
-- duplicating the study's primary answer data.
create table if not exists public.study_events (
  id bigserial primary key,
  event_id uuid not null unique,
  participant_id text not null references public.sessions(participant_id) on delete cascade,
  event_type text not null check (event_type in (
    'pretest_started', 'pretest_finished', 'learning_started',
    'learning_completed', 'example_attempted', 'learning_continue',
    'posttest_started', 'posttest_finished', 'questionnaire_shown',
    'questionnaire_opened', 'questionnaire_finished'
  )),
  server_timestamp timestamptz not null default now(),
  client_timestamp timestamptz,
  elapsed_seconds integer check (elapsed_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists study_events_participant_time_idx
  on public.study_events (participant_id, server_timestamp);

alter table public.study_events enable row level security;

-- The return shape changed to include a private per-session logging token.
drop function if exists public.assign_participant(boolean);
drop function if exists public.assign_participant(boolean, text);

create or replace function public.assign_participant(
  p_randomize boolean,
  p_consent_version text,
  p_assignment_request_id uuid,
  p_session_token text
)
returns table (
  participant_id text,
  seq integer,
  condition text,
  session_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
  v_id text;
  v_condition text;
  v_block integer;
  v_ai_on_odd boolean;
  v_existing public.sessions%rowtype;
begin
  if p_session_token is null or p_session_token !~
     '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    raise exception 'invalid session token';
  end if;

  -- A repeated consent request returns the original assignment. The advisory
  -- lock also protects two simultaneous retries of the same browser request.
  perform pg_advisory_xact_lock(hashtextextended(p_assignment_request_id::text, 0));
  select * into v_existing
  from public.sessions
  where assignment_request_id = p_assignment_request_id;

  if found then
    if v_existing.session_token_hash <>
       encode(extensions.digest(p_session_token, 'sha256'), 'hex') then
      raise exception using errcode = '28000', message = 'invalid assignment retry';
    end if;
    return query select
      v_existing.participant_id,
      v_existing.seq,
      v_existing.condition,
      p_session_token;
    return;
  end if;

  v_seq := nextval('public.participant_seq');
  v_id := 'P' || lpad(v_seq::text, 3, '0');

  if p_randomize then
    v_block := ((v_seq - 1) / 2) + 1;
    insert into public.assignment_blocks (block_number, ai_on_odd)
    values (v_block, random() < 0.5)
    on conflict (block_number) do nothing;

    select ai_on_odd into v_ai_on_odd
    from public.assignment_blocks
    where block_number = v_block;

    v_condition := case
      when (v_seq % 2 = 1) = v_ai_on_odd then 'ai'
      else 'static'
    end;
  else
    v_condition := 'ai';
  end if;

  insert into public.sessions (
    participant_id,
    seq,
    condition,
    consent_completed_at,
    consent_version,
    assignment_request_id,
    session_token_hash
  ) values (
    v_id,
    v_seq,
    v_condition,
    now(),
    p_consent_version,
    p_assignment_request_id,
    encode(extensions.digest(p_session_token, 'sha256'), 'hex')
  );

  return query select v_id, v_seq, v_condition, p_session_token;
end;
$$;

revoke all on function public.assign_participant(boolean, text, uuid, text) from public;
revoke all on function public.assign_participant(boolean, text, uuid, text) from anon;
revoke all on function public.assign_participant(boolean, text, uuid, text) from authenticated;
grant execute on function public.assign_participant(boolean, text, uuid, text) to service_role;

-- Authenticates the participant, appends the event, and updates the convenient
-- summary columns in one transaction. First submissions remain authoritative;
-- repeated visits are still retained in study_events for exclusion decisions.
create or replace function public.record_study_event(
  p_participant_id text,
  p_session_token text,
  p_event_id uuid,
  p_event_type text,
  p_client_timestamp timestamptz,
  p_payload jsonb default '{}'::jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_token_hash text;
  v_elapsed integer;
  v_example text;
  v_existing_timestamp timestamptz;
begin
  select session_token_hash into v_token_hash
  from public.sessions
  where participant_id = p_participant_id;

  if v_token_hash is null or
     v_token_hash <> encode(extensions.digest(coalesce(p_session_token, ''), 'sha256'), 'hex') then
    raise exception using errcode = '28000', message = 'invalid study session';
  end if;

  if p_event_type not in (
    'pretest_started', 'pretest_finished', 'learning_started',
    'learning_completed', 'example_attempted', 'learning_continue',
    'posttest_started', 'posttest_finished', 'questionnaire_shown',
    'questionnaire_opened', 'questionnaire_finished'
  ) then
    raise exception 'invalid event type: %', p_event_type;
  end if;

  v_elapsed := case
    when (p_payload->>'elapsed_seconds') ~ '^[0-9]+$'
      then (p_payload->>'elapsed_seconds')::integer
    else null
  end;
  v_example := p_payload->>'example_id';

  if v_example is not null and
     v_example not in ('linkedlist', 'arraylist', 'stack', 'livetrace') then
    raise exception 'invalid example id: %', v_example;
  end if;

  insert into public.study_events (
    event_id,
    participant_id,
    event_type,
    server_timestamp,
    client_timestamp,
    elapsed_seconds,
    metadata
  ) values (
    p_event_id,
    p_participant_id,
    p_event_type,
    v_now,
    p_client_timestamp,
    v_elapsed,
    coalesce(p_payload, '{}'::jsonb) - 'responses'
  ) on conflict (event_id) do nothing;

  if not found then
    select server_timestamp into v_existing_timestamp
    from public.study_events
    where event_id = p_event_id and participant_id = p_participant_id;
    if v_existing_timestamp is null then
      raise exception using errcode = '28000', message = 'event id already belongs to another session';
    end if;
    return v_existing_timestamp;
  end if;

  case p_event_type
    when 'pretest_started' then
      update public.sessions
      set pretest_started_at = coalesce(pretest_started_at, v_now)
      where participant_id = p_participant_id;
    when 'pretest_finished' then
      update public.sessions set
        pretest_finished_at = coalesce(pretest_finished_at, v_now),
        pretest_ended_by = coalesce(pretest_ended_by, p_payload->>'ended_by'),
        pretest_responses = coalesce(pretest_responses, p_payload->'responses', '{}'::jsonb),
        pretest_elapsed_seconds = coalesce(pretest_elapsed_seconds, v_elapsed)
      where participant_id = p_participant_id;
    when 'learning_started' then
      update public.sessions
      set learning_started_at = coalesce(learning_started_at, v_now)
      where participant_id = p_participant_id;
    when 'learning_completed' then
      update public.sessions set
        learning_completed_at = coalesce(learning_completed_at, v_now),
        learning_elapsed_seconds = coalesce(learning_elapsed_seconds, v_elapsed),
        measured_lesson_id = coalesce(measured_lesson_id, v_example),
        examples_tried = case
          when v_example is null or v_example = any(examples_tried) then examples_tried
          else array_append(examples_tried, v_example)
        end
      where participant_id = p_participant_id;
    when 'example_attempted' then
      update public.sessions set examples_tried = case
        when v_example is null or v_example = any(examples_tried) then examples_tried
        else array_append(examples_tried, v_example)
      end where participant_id = p_participant_id;
    when 'learning_continue' then
      update public.sessions set
        learning_continue_at = coalesce(learning_continue_at, v_now),
        learning_elapsed_seconds = coalesce(learning_elapsed_seconds, v_elapsed)
      where participant_id = p_participant_id;
    when 'posttest_started' then
      update public.sessions
      set posttest_started_at = coalesce(posttest_started_at, v_now)
      where participant_id = p_participant_id;
    when 'posttest_finished' then
      update public.sessions set
        posttest_finished_at = coalesce(posttest_finished_at, v_now),
        posttest_ended_by = coalesce(posttest_ended_by, p_payload->>'ended_by'),
        posttest_responses = coalesce(posttest_responses, p_payload->'responses', '{}'::jsonb),
        posttest_elapsed_seconds = coalesce(posttest_elapsed_seconds, v_elapsed)
      where participant_id = p_participant_id;
    when 'questionnaire_shown' then
      update public.sessions
      set questionnaire_shown_at = coalesce(questionnaire_shown_at, v_now)
      where participant_id = p_participant_id;
    when 'questionnaire_opened' then
      update public.sessions
      set questionnaire_opened_at = coalesce(questionnaire_opened_at, v_now)
      where participant_id = p_participant_id;
    when 'questionnaire_finished' then
      update public.sessions
      set questionnaire_finished_at = coalesce(questionnaire_finished_at, v_now)
      where participant_id = p_participant_id;
  end case;

  return v_now;
end;
$$;

revoke all on function public.record_study_event(text, text, uuid, text, timestamptz, jsonb) from public;
revoke all on function public.record_study_event(text, text, uuid, text, timestamptz, jsonb) from anon;
revoke all on function public.record_study_event(text, text, uuid, text, timestamptz, jsonb) from authenticated;
grant execute on function public.record_study_event(text, text, uuid, text, timestamptz, jsonb) to service_role;

-- Researcher-only reconciliation after matching the external questionnaire by
-- participant ID. This also leaves an immutable audit event.
create or replace function public.mark_questionnaire_finished_admin(
  p_participant_id text,
  p_finished_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sessions
  set questionnaire_finished_at = coalesce(questionnaire_finished_at, p_finished_at)
  where participant_id = p_participant_id
    and questionnaire_finished_at is null;

  if not found then
    return exists (
      select 1 from public.sessions where participant_id = p_participant_id
    );
  end if;

  insert into public.study_events (
    event_id, participant_id, event_type, server_timestamp, metadata
  ) values (
    gen_random_uuid(), p_participant_id, 'questionnaire_finished',
    p_finished_at, '{"source":"researcher_reconciliation"}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.mark_questionnaire_finished_admin(text, timestamptz) from public;
revoke all on function public.mark_questionnaire_finished_admin(text, timestamptz) from anon;
revoke all on function public.mark_questionnaire_finished_admin(text, timestamptz) from authenticated;
grant execute on function public.mark_questionnaire_finished_admin(text, timestamptz) to service_role;
