-- Every eligible occurrence earns EXP. The daily cap applies to gold only.
create function public.reconcile_session_reward(p_owner uuid, session_key text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  session_data jsonb;
  occurrence_key text;
  workout_date date;
  species text;
  set_count integer;
  day_complete boolean;
  gold_award integer;
begin
  select data into session_data from public.training_items
    where owner = p_owner and kind = 'session' and id = session_key;
  if session_data ->> 'scheduleId' is not null then
    occurrence_key := 'schedule:' || (session_data ->> 'scheduleId');
  elsif session_data ->> 'cycleId' is not null and session_data ->> 'dayId' is not null then
    occurrence_key := 'cycle:' || (session_data ->> 'cycleId') || ':' || (session_data ->> 'dayId');
  end if;
  if occurrence_key is null then return; end if;
  if (session_data ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$' then
    begin workout_date := (session_data ->> 'date')::date;
    exception when datetime_field_overflow then workout_date := null;
    end;
  end if;
  if workout_date is null then return; end if;
  species := session_data ->> 'companion';
  with moves as (
    select exercise ->> 'id' as id from jsonb_array_elements(session_data -> 'exercises') exercise
  ), trained as (
    select distinct data ->> 'exerciseId' as id from public.training_items
      where owner = p_owner and kind = 'set' and data ->> 'sessionId' = session_key
      and data -> 'done' = 'true'::jsonb and coalesce(data ->> 'type', 'work') <> 'warmup'
  )
  select count(trained.id), bool_and(trained.id is not null or coalesce((session_data -> 'omitted') ? moves.id,false))
    into set_count, day_complete from moves left join trained using(id);

  if jsonb_typeof(session_data -> 'ended') is distinct from 'number'
    or session_data -> 'incomplete' = 'true'::jsonb or set_count < 1 or day_complete is not true then
    delete from public.session_rewards where owner = p_owner and session_id = session_key and occurrence is not null;
    return;
  end if;
  select case when count(*) < 3 then 20 else 0 end into gold_award
    from public.session_rewards
    where owner = p_owner and training_date = workout_date and gold > 0;
  insert into public.session_rewards(owner, session_id, xp, gold, companion, occurrence, training_date)
    values(p_owner, session_key, 25, gold_award, species, occurrence_key, workout_date)
    on conflict do nothing;
end;
$$;

revoke all on function public.reconcile_session_reward(uuid,text) from public, anon, authenticated;

create or replace function public.award_training_session()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind = 'session' then
    perform public.reconcile_session_reward(new.owner, new.id);
  elsif new.kind = 'set' then
    perform public.reconcile_session_reward(new.owner, new.data ->> 'sessionId');
  end if;
  return new;
end;
$$;

-- Restore rewards for eligible sessions already stored without editing their versions.
do $$
declare
  session_row record;
begin
  for session_row in
    select item.owner, item.id from public.training_items item
    where item.kind = 'session' and jsonb_typeof(item.data -> 'ended') = 'number'
      and not exists (select 1 from public.session_rewards reward
        where reward.owner = item.owner and reward.session_id = item.id)
    order by item.owner, item.data ->> 'date', (item.data ->> 'ended')::numeric, item.id
  loop
    perform public.reconcile_session_reward(session_row.owner, session_row.id);
  end loop;
end;
$$;
