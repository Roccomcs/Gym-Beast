-- Catalog prices and equipment slots are checked by the server.
create table public.pet_goods (
  id text primary key,
  price integer not null check (price > 0),
  slot text not null check (slot in ('top','bottom','head','face','neck','wrist','hands','buddy','egg'))
);
alter table public.pet_goods enable row level security;
revoke all on public.pet_goods from public, anon, authenticated;

insert into public.pet_goods(id, price, slot) values
  ('bandana', 40, 'neck'),
  ('medalla', 80, 'neck'),
  ('boca', 100, 'top'),
  ('river', 100, 'top'),
  ('racing', 100, 'top'),
  ('independiente', 100, 'top'),
  ('san-lorenzo', 100, 'top'),
  ('argentina', 140, 'top'),
  ('real-madrid', 140, 'top'),
  ('barcelona', 140, 'top'),
  ('liverpool', 140, 'top'),
  ('manchester-city', 140, 'top'),
  ('manchester-united', 140, 'top'),
  ('bayern', 140, 'top'),
  ('psg', 140, 'top'),
  ('milan', 140, 'top'),
  ('juventus', 140, 'top'),
  ('tank-lime', 60, 'top'),
  ('tank-iron', 65, 'top'),
  ('tank-sunset', 70, 'top'),
  ('dryfit', 75, 'top'),
  ('gym-bro', 85, 'top'),
  ('hoodie', 120, 'top'),
  ('jogger', 75, 'bottom'),
  ('shorts', 60, 'bottom'),
  ('track-pants', 90, 'bottom'),
  ('tech-shorts', 85, 'bottom'),
  ('gold-chain', 120, 'neck'),
  ('silver-chain', 90, 'neck'),
  ('obsidian-chain', 140, 'neck'),
  ('watch', 130, 'wrist'),
  ('sport-watch', 95, 'wrist'),
  ('gym-cap', 65, 'head'),
  ('retro-cap', 80, 'head'),
  ('lunar-crown', 240, 'head'),
  ('gold-crown', 240, 'head'),
  ('sun-glasses', 80, 'face'),
  ('sport-glasses', 95, 'face'),
  ('box-red', 110, 'hands'),
  ('box-gold', 170, 'hands'),
  ('grip-gloves', 85, 'hands'),
  ('magic-wand', 180, 'buddy'),
  ('ember-buddy', 220, 'buddy'),
  ('moon-buddy', 220, 'buddy'),
  ('slime-buddy', 180, 'buddy'),
  ('pet-axolotl', 160, 'buddy'),
  ('pet-tiger', 160, 'buddy'),
  ('egg:Dragón', 200, 'egg'),
  ('egg:Cocodrilo', 200, 'egg'),
  ('egg:Oso', 200, 'egg'),
  ('egg:Lobo', 200, 'egg'),
  ('egg:Zorro', 260, 'egg'),
  ('egg:Ajolote', 280, 'egg'),
  ('egg:Tigre', 300, 'egg'),
  ('egg:Fénix', 320, 'egg');

create or replace function public.buy_pet_good(p_good text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  cost integer;
  account_profile jsonb;
begin
  if actor is null then raise exception 'Account required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  select price into cost from public.pet_goods where id = p_good;
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
    if (new.data ->> 'reps')::numeric not between 1 and 1000 then raise exception 'Invalid repetitions'; end if;
  end if;
  return new;
end;
$$;
