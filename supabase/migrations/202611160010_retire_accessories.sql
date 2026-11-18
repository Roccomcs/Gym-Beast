delete from public.pet_goods where id in ('bandana', 'medalla', 'gold-chain', 'silver-chain', 'obsidian-chain', 'sun-glasses', 'sport-glasses', 'box-red', 'box-gold', 'grip-gloves');

create function public.strip_retired_pet_gear() returns trigger
language plpgsql set search_path = '' as $$
declare
  retired constant text[] := array['bandana', 'medalla', 'gold-chain', 'silver-chain', 'obsidian-chain', 'sun-glasses', 'sport-glasses', 'box-red', 'box-gold', 'grip-gloves'];
  species text;
  slots jsonb;
  cleaned jsonb;
begin
  if new.data ->> 'equipped' = any(retired) then
    new.data := new.data - 'equipped';
  end if;
  if jsonb_typeof(new.data -> 'petGear') = 'object' then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into cleaned
    from jsonb_each(new.data -> 'petGear')
    where (value #>> '{}' = any(retired)) is not true;
    new.data := jsonb_set(new.data, '{petGear}', cleaned);
  end if;
  if jsonb_typeof(new.data -> 'petOutfits') = 'object' then
    for species, slots in select key, value from jsonb_each(new.data -> 'petOutfits') loop
      if jsonb_typeof(slots) = 'object' then
        select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into cleaned
        from jsonb_each(slots)
        where (value #>> '{}' = any(retired)) is not true;
        new.data := jsonb_set(new.data, array['petOutfits', species], cleaned);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger strip_retired_pet_gear before insert or update on public.training_items
for each row when (new.kind = 'profile') execute function public.strip_retired_pet_gear();
