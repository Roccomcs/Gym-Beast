-- Seconds use the existing reps storage field; never increase the bound for strength repetitions.
create or replace function public.validate_training_write() returns trigger
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
    if new.data ? 'petOutfits' then
      if jsonb_typeof(new.data -> 'petOutfits') is distinct from 'object' then raise exception 'Invalid outfits'; end if;
      if exists (
        select 1 from jsonb_each(new.data -> 'petOutfits') as outfit(species, slots)
        where jsonb_typeof(outfit.slots) is distinct from 'object'
          or (outfit.species is distinct from starter and not purchases ? ('egg:' || outfit.species))
      ) then raise exception 'Invalid outfit or companion not owned'; end if;
      if exists (
        select 1 from jsonb_each(new.data -> 'petOutfits') as outfit(species, slots)
        cross join lateral jsonb_each_text(outfit.slots) as entry(slot, good)
        left join public.pet_goods catalog on catalog.id = entry.good
        where entry.slot not in ('top','bottom','head','face','neck','wrist','hands','buddy')
          or (entry.good is not null and (catalog.slot is distinct from entry.slot or not purchases ? entry.good))
      ) then raise exception 'Good not owned or invalid slot'; end if;
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
    if (new.data ->> 'reps')::numeric not between 1 and (case when exists (
      select 1 from public.training_items s cross join lateral jsonb_array_elements(s.data->'exercises') e
      where s.owner=new.owner and s.kind='session' and s.id=new.data->>'sessionId'
        and e->>'id'=new.data->>'exerciseId' and e->>'measure'='seconds'
    ) then 86400 else 1000 end) then raise exception 'Invalid repetitions'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_training_write() from public,anon,authenticated;
