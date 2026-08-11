-- Records which built-in Java examples each participant actually opened.
-- The array stores each preset once, making study exports easy to analyze.

alter table public.sessions
  add column if not exists examples_tried text[] not null default '{}'::text[];

create or replace function public.record_example_attempt(
  p_participant_id text,
  p_example_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_example_id not in ('linkedlist', 'arraylist', 'stack', 'livetrace') then
    raise exception 'invalid example id: %', p_example_id;
  end if;

  update public.sessions
  set examples_tried = case
    when p_example_id = any(examples_tried) then examples_tried
    else array_append(examples_tried, p_example_id)
  end
  where participant_id = p_participant_id;

  if not found then
    raise exception 'participant not found: %', p_participant_id;
  end if;
end;
$$;

revoke all on function public.record_example_attempt(text, text) from public;
revoke all on function public.record_example_attempt(text, text) from anon;
revoke all on function public.record_example_attempt(text, text) from authenticated;
grant execute on function public.record_example_attempt(text, text) to service_role;
