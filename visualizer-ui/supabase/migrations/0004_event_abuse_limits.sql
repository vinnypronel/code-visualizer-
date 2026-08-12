-- Bound append-only event storage per participant. A normal completed session
-- emits far fewer than 100 events, including retries and additional examples.
-- The advisory lock makes the cap reliable under concurrent requests.
create or replace function public.enforce_study_event_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Preserve idempotent replay even after a session reaches its event cap.
  if exists (select 1 from public.study_events where event_id = new.event_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.participant_id, 0));
  if (select count(*) from public.study_events where participant_id = new.participant_id) >= 100 then
    raise exception using errcode = '54000', message = 'study event limit reached';
  end if;

  -- Do not retain arbitrary client-supplied metadata fields.
  new.metadata := jsonb_strip_nulls(jsonb_build_object(
    'ended_by', new.metadata->'ended_by',
    'example_id', new.metadata->'example_id'
  ));
  return new;
end;
$$;

drop trigger if exists study_event_limits_before_insert on public.study_events;
create trigger study_event_limits_before_insert
before insert on public.study_events
for each row execute function public.enforce_study_event_limits();

revoke all on function public.enforce_study_event_limits() from public;
revoke all on function public.enforce_study_event_limits() from anon;
revoke all on function public.enforce_study_event_limits() from authenticated;
