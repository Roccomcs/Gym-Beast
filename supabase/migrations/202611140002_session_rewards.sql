create table public.session_rewards (
  owner uuid not null references auth.users on delete cascade,
  session_id text not null,
  awarded_at timestamptz not null default statement_timestamp(),
  xp integer not null check (xp = 25),
  primary key (owner, session_id)
);
alter table public.session_rewards enable row level security;
revoke all on public.session_rewards from public, anon, authenticated;
grant select on public.session_rewards to authenticated;
create policy read_own_rewards on public.session_rewards for select to authenticated
  using (owner = (select auth.uid()));

create function public.award_training_session()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  session_row public.training_items%rowtype;
  session_key text;
  start_ms numeric;
  end_ms numeric;
  today_start timestamptz := date_trunc('day', statement_timestamp(), 'UTC');
begin
  if new.kind = 'session' then
    session_key := new.id;
  elsif new.kind = 'set' then
    session_key := new.data ->> 'sessionId';
  else
    return new;
  end if;

  select * into session_row from public.training_items
    where owner = new.owner and kind = 'session' and id = session_key;
  if jsonb_typeof(session_row.data -> 'started') is distinct from 'number'
    or jsonb_typeof(session_row.data -> 'ended') is distinct from 'number'
    or jsonb_typeof(session_row.data -> 'exercises') is distinct from 'array' then
    return new;
  end if;

  start_ms := (session_row.data ->> 'started')::numeric;
  end_ms := (session_row.data ->> 'ended')::numeric;
  if start_ms <= 0 or end_ms - start_ms not between 60000 and 86400000
    or end_ms > extract(epoch from statement_timestamp()) * 1000 + 300000 then
    return new;
  end if;

  if (select count(*) from public.session_rewards where owner = new.owner and awarded_at >= today_start) >= 3 then
    return new;
  end if;

  if exists (
    select 1 from public.training_items as performed
    where performed.owner = new.owner and performed.kind = 'set'
      and performed.data ->> 'sessionId' = session_key
      and performed.data -> 'done' = 'true'::jsonb
      and case when jsonb_typeof(performed.data -> 'reps') = 'number'
        then (performed.data ->> 'reps')::numeric between 1 and 1000 else false end
      and exists (
        select 1 from jsonb_array_elements(session_row.data -> 'exercises') as exercise
        where exercise ->> 'id' = performed.data ->> 'exerciseId'
      )
  ) then
    insert into public.session_rewards (owner, session_id, xp)
    values (new.owner, session_key, 25) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.award_training_session() from public, anon, authenticated;
create trigger award_training_session after insert or update on public.training_items
  for each row execute function public.award_training_session();
