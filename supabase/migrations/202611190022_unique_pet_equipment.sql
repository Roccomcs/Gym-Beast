-- A purchased item has a single wearer. The profile row provides transactional
-- serialization and the existing revision checks handle concurrent devices.
create or replace function public.validate_unique_pet_equipment() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.kind = 'profile' and new.data ? 'petOutfits'
     and (tg_op = 'INSERT' or new.data->'petOutfits' is distinct from old.data->'petOutfits') then
    if exists (
      select entry.good
      from jsonb_each(new.data->'petOutfits') outfit(species, slots)
      cross join lateral jsonb_each_text(outfit.slots) entry(slot, good)
      where entry.good is not null
      group by entry.good having count(*) > 1
    ) then raise exception 'Item already equipped by another companion'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists unique_pet_equipment on public.training_items;
create trigger unique_pet_equipment before insert or update on public.training_items
for each row execute function public.validate_unique_pet_equipment();
