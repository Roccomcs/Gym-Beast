-- Validate new snapshot metadata without rewriting historical sessions.
create function public.valid_exercise_snapshot(e jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare key text; value jsonb; c jsonb;
  muscles text[]:=array['Pecho','Espalda','Hombros','Bíceps','Tríceps','Abdominales','Glúteos','Cuádriceps','Isquiotibiales','Aductores','Abductores','Gemelos','Cuerpo completo'];
begin
  if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'id') is distinct from 'string' then return false; end if;
  if e ? 'name' and (jsonb_typeof(e->'name')<>'string' or length(trim(e->>'name'))=0) then return false; end if;
  foreach key in array array['sets','min','max','load','rest'] loop
    value:=e->key;
    if value is not null and value<>'null'::jsonb then
      if jsonb_typeof(value)<>'number' then return false; end if;
      if value::numeric<0 then return false; end if;
      if key<>'load' and value::numeric<>trunc(value::numeric) then return false; end if;
      if key in ('sets','min','max') and value::numeric<1 then return false; end if;
      if key='sets' and value::numeric>100 then return false; end if;
    end if;
  end loop;
  if e->>'min' is not null and e->>'max' is not null and (e->>'max')::numeric<(e->>'min')::numeric then return false; end if;
  if e ? 'mode' and not coalesce(e->>'mode' in ('external','per-side','bodyweight','assisted','unknown'),false) then return false; end if;
  if e ? 'measure' and not coalesce(e->>'measure' in ('reps','seconds'),false) then return false; end if;
  if e ? 'unit' and e->'unit'<>'null'::jsonb and e->>'unit' not in ('kg','lb') then return false; end if;
  if e ? 'reviewAccepted' and jsonb_typeof(e->'reviewAccepted')<>'boolean' then return false; end if;
  if e ? 'guidance' and e->'guidance'<>'null'::jsonb then
    if jsonb_typeof(e->'guidance')<>'string' or length(e->>'guidance')>300 then return false; end if;
  end if;
  if e ? 'custom' then
    c:=e->'custom';
    if jsonb_typeof(c)<>'object' or jsonb_typeof(c->'id') is distinct from 'string'
      or (c->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or not coalesce(c->>'primary'=any(muscles),false)
      or jsonb_typeof(c->'secondary') is distinct from 'array'
      or not coalesce(c->>'equipment' in ('Barra','Mancuernas','Máquina','Polea','Disco','Peso corporal','Cinta','Otro'),false) then return false; end if;
    if jsonb_array_length(c->'secondary')>12 or exists(select 1 from jsonb_array_elements(c->'secondary') m
      where jsonb_typeof(m)<>'string' or not(m#>>'{}'=any(muscles)) or m#>>'{}'=c->>'primary')
      or (select count(*)<>count(distinct m) from jsonb_array_elements(c->'secondary') m) then return false; end if;
  end if;
  return true;
end $$;
revoke all on function public.valid_exercise_snapshot(jsonb) from public,anon,authenticated;

create function public.validate_exercise_snapshots() returns trigger
language plpgsql security definer set search_path='' as $$
declare day jsonb; exercise jsonb;
begin
  if new.kind='routine' then
    for day in select value from jsonb_array_elements(new.data->'days') loop
      for exercise in select value from jsonb_array_elements(day->'exercises') loop
        if not public.valid_exercise_snapshot(exercise) then raise exception 'Revisá los datos del ejercicio'; end if;
      end loop;
    end loop;
  elsif new.kind in ('session','schedule') then
    for exercise in select value from jsonb_array_elements(new.data->'exercises') loop
      if not public.valid_exercise_snapshot(exercise) then raise exception 'Revisá los datos del ejercicio'; end if;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.validate_exercise_snapshots() from public,anon,authenticated;
create trigger validate_exercise_snapshots before insert or update on public.training_items
  for each row execute function public.validate_exercise_snapshots();
