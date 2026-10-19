-- Enrollment cap: 20 COMPLETED sessions per condition (40 total).
--
-- "Completed" = the participant reached the end of the post-test
-- (posttest_finished_at is set). People who start but quit before that do not
-- count, so later participants naturally replace them until each condition has
-- 20 finishers. An "active window" keeps very recent in-progress sessions in the
-- balance so we don't over-assign one condition while several people are still
-- mid-session; sessions older than that window with no finish are treated as
-- abandoned and free their slot.
--
-- When both conditions have 20 completed, assignment raises 'study full'
-- (sqlstate 57014) and the API turns that into a friendly closed-study screen.

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
  v_existing public.sessions%rowtype;
  v_ai_done integer;
  v_static_done integer;
  v_ai_load integer;
  v_static_load integer;
  v_target constant integer := 20;
  v_active_window constant interval := interval '3 hours';
begin
  if p_session_token is null or p_session_token !~
     '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    raise exception 'invalid session token';
  end if;

  -- A repeated consent request returns the original assignment.
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

  -- Serialize fresh assignments so two at once cannot read stale counts and
  -- both land in the same condition.
  perform pg_advisory_xact_lock(hashtextextended('assign_participant_counts', 0));

  select
    count(*) filter (where condition = 'ai' and posttest_finished_at is not null),
    count(*) filter (where condition = 'static' and posttest_finished_at is not null),
    count(*) filter (where condition = 'ai'
      and (posttest_finished_at is not null or created_at > now() - v_active_window)),
    count(*) filter (where condition = 'static'
      and (posttest_finished_at is not null or created_at > now() - v_active_window))
  into v_ai_done, v_static_done, v_ai_load, v_static_load
  from public.sessions;

  -- Both full: study is closed.
  if v_ai_done >= v_target and v_static_done >= v_target then
    raise exception using errcode = '57014', message = 'study full';
  end if;

  -- One condition full: send everyone to the other.
  if v_ai_done >= v_target then
    v_condition := 'static';
  elsif v_static_done >= v_target then
    v_condition := 'ai';
  elsif not p_randomize then
    v_condition := 'ai';
  else
    -- Both still open: steer toward whichever is lighter (completed + active),
    -- random tie-break so the next condition is not predictable on a tie.
    if v_ai_load < v_static_load then
      v_condition := 'ai';
    elsif v_static_load < v_ai_load then
      v_condition := 'static';
    else
      v_condition := case when random() < 0.5 then 'ai' else 'static' end;
    end if;
  end if;

  v_seq := nextval('public.participant_seq');
  v_id := 'P' || lpad(v_seq::text, 3, '0');

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

-- Live enrollment counts for the researcher dashboard: completed per condition,
-- plus how many are still in progress right now.
create or replace function public.enrollment_counts()
returns table (
  condition text,
  completed integer,
  in_progress integer
)
language sql
security definer
set search_path = public
as $$
  select
    c as condition,
    count(*) filter (where s.condition = c and s.posttest_finished_at is not null)::int as completed,
    count(*) filter (where s.condition = c and s.posttest_finished_at is null)::int as in_progress
  from (values ('ai'), ('static')) as conditions(c)
  left join public.sessions s on s.condition = conditions.c
  group by c
  order by c;
$$;

revoke all on function public.enrollment_counts() from public;
revoke all on function public.enrollment_counts() from anon;
revoke all on function public.enrollment_counts() from authenticated;
grant execute on function public.enrollment_counts() to service_role;
