alter table public.session_rewards
  add column gold integer not null default 0 check (gold in (0,20)),
  add column companion text,
  add column occurrence text,
  add column training_date date;
create unique index one_reward_per_occurrence on public.session_rewards(owner, occurrence) where occurrence is not null;
create index performed_session_lookup on public.training_items(owner, (data ->> 'sessionId')) where kind = 'set';

create table public.pet_purchases (
  owner uuid not null references auth.users on delete cascade,
  good text not null,
  price integer not null check (price > 0),
  primary key(owner, good)
);
alter table public.pet_purchases enable row level security;
revoke all on public.pet_purchases from public, anon, authenticated;

create function public.buy_pet_good(p_good text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  cost integer;
  account_profile jsonb;
begin
  if actor is null then raise exception 'Account required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  cost := case
    when p_good = 'bandana' then 40
    when p_good = 'medalla' then 80
    when p_good in ('egg:Dragón','egg:Cocodrilo','egg:Oso','egg:Lobo') then 200
  end;
  if cost is null then raise exception 'Unknown good'; end if;
  if exists(select 1 from public.pet_purchases where owner = actor and good = p_good) then return; end if;
  select data into account_profile from public.training_items
    where owner = actor and kind = 'profile' and id = 'self';
  if account_profile is null or p_good = 'egg:' || (account_profile ->> 'starter') then raise exception 'Invalid purchase'; end if;
  if coalesce((select sum(gold) from public.session_rewards where owner = actor), 0) -
    coalesce((select sum(price) from public.pet_purchases where owner = actor), 0) < cost then
    raise exception 'Insufficient balance';
  end if;
  insert into public.pet_purchases values(actor, p_good, cost);
  update public.training_items set version = version + 1, updated_at = now(),
    data = jsonb_set(data, '{purchases}', (
      select jsonb_agg(good order by good) from public.pet_purchases where owner = actor
    ))
    where owner = actor and kind = 'profile' and id = 'self';
end;
$$;
revoke all on function public.buy_pet_good(text) from public, anon;
grant execute on function public.buy_pet_good(text) to authenticated;

create function public.validate_training_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  purchases jsonb;
  starter text;
  chosen text;
begin
  if new.kind = 'profile' then
    select coalesce(jsonb_agg(good order by good), '[]'::jsonb) into purchases
      from public.pet_purchases where owner = new.owner;
    starter := coalesce(old.data ->> 'starter', new.data ->> 'starter');
    chosen := new.data ->> 'companion';
    if starter is not null then
      if starter not in ('Dragón','Cocodrilo','Oso','Lobo') then raise exception 'Invalid starter'; end if;
      if chosen is null or (chosen <> starter and not purchases ? ('egg:' || chosen)) then
        raise exception 'Companion not owned';
      end if;
      new.data := jsonb_set(new.data,'{starter}',to_jsonb(starter));
    end if;
    if new.data ? 'equipped' and not purchases ? (new.data ->> 'equipped') then raise exception 'Good not owned'; end if;
    if new.data ? 'petGear' then
      if jsonb_typeof(new.data -> 'petGear') is distinct from 'object' then raise exception 'Invalid equipment'; end if;
      if exists(select 1 from jsonb_each_text(new.data -> 'petGear') as gear(species, good)
        where gear.good is not null and
          (gear.good not in ('bandana','medalla') or not purchases ? gear.good
           or (gear.species is distinct from starter and not purchases ? ('egg:' || gear.species)))) then
        raise exception 'Good or companion not owned';
      end if;
    end if;
    new.data := jsonb_set(new.data,'{purchases}',purchases);
  elsif new.kind in ('session','schedule') then
    if jsonb_typeof(new.data -> 'exercises') is distinct from 'array'
      or jsonb_typeof(new.data -> 'title') is distinct from 'string'
    then raise exception 'Invalid session or schedule'; end if;
  elsif new.kind = 'routine' then
    if jsonb_typeof(new.data -> 'days') is distinct from 'array'
      or jsonb_typeof(new.data -> 'name') is distinct from 'string'
    then raise exception 'Invalid routine'; end if;
  elsif new.kind = 'set' then
    if jsonb_typeof(new.data -> 'sessionId') is distinct from 'string'
      or jsonb_typeof(new.data -> 'exerciseId') is distinct from 'string'
      or jsonb_typeof(new.data -> 'done') is distinct from 'boolean'
      or jsonb_typeof(new.data -> 'reps') is distinct from 'number'
    then raise exception 'Invalid set'; end if;
    if (new.data ->> 'reps')::numeric not between 1 and 1000 then raise exception 'Invalid repetitions'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_training_write() from public, anon, authenticated;
create trigger validate_training_write before insert or update on public.training_items
  for each row execute function public.validate_training_write();

create or replace function public.award_training_session()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  session_data jsonb;
  session_key text;
  occurrence_key text;
  workout_date date;
  species text;
  set_count integer;
  day_complete boolean;
begin
  if new.kind = 'session' then session_key := new.id;
  elsif new.kind = 'set' then session_key := new.data ->> 'sessionId';
  else return new;
  end if;
  select data into session_data from public.training_items
    where owner = new.owner and kind = 'session' and id = session_key;
  if session_data ->> 'scheduleId' is not null then
    occurrence_key := 'schedule:' || (session_data ->> 'scheduleId');
  elsif session_data ->> 'cycleId' is not null and session_data ->> 'dayId' is not null then
    occurrence_key := 'cycle:' || (session_data ->> 'cycleId') || ':' || (session_data ->> 'dayId');
  end if;
  if occurrence_key is null then return new; end if;
  if (session_data ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$' then
    begin workout_date := (session_data ->> 'date')::date;
    exception when datetime_field_overflow then workout_date := null;
    end;
  end if;
  if workout_date is null then return new; end if;
  species := session_data ->> 'companion';
  with moves as (
    select exercise ->> 'id' as id from jsonb_array_elements(session_data -> 'exercises') exercise
  ), trained as (
    select distinct data ->> 'exerciseId' as id from public.training_items
      where owner = new.owner and kind = 'set' and data ->> 'sessionId' = session_key
      and data -> 'done' = 'true'::jsonb and coalesce(data ->> 'type', 'work') <> 'warmup'
  )
  select count(trained.id), bool_and(trained.id is not null or coalesce((session_data -> 'omitted') ? moves.id,false))
    into set_count, day_complete from moves left join trained using(id);

  if jsonb_typeof(session_data -> 'ended') is distinct from 'number'
    or session_data -> 'incomplete' = 'true'::jsonb or set_count < 1 or day_complete is not true then
    delete from public.session_rewards where owner = new.owner and session_id = session_key and gold > 0;
    return new;
  end if;
  if (select count(*) from public.session_rewards where owner = new.owner and training_date = workout_date) >= 3 then
    return new;
  end if;
  insert into public.session_rewards(owner, session_id, xp, gold, companion, occurrence, training_date)
    values(new.owner, session_key, 25, 20, species, occurrence_key, workout_date)
    on conflict do nothing;
  return new;
end;
$$;
