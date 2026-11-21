create function public.validate_pet_plan_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare plan jsonb;
begin
  if new.kind<>'profile' then return new; end if;
  if new.data ? 'timezone' and not exists(select 1 from pg_catalog.pg_timezone_names where name=new.data->>'timezone') then
    raise exception 'Zona horaria inválida';
  end if;
  if not (new.data ? 'petPlans') then return new; end if;
  if jsonb_typeof(new.data->'petPlans')<>'array' or jsonb_array_length(new.data->'petPlans')>2000 then
    raise exception 'Plan semanal inválido';
  end if;
  for plan in select value from jsonb_array_elements(new.data->'petPlans') loop
    if coalesce(plan->>'from','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha de plan inválida'; end if;
    perform (plan->>'from')::date;
    if jsonb_typeof(plan->'target') is distinct from 'number' or (plan->>'target')::numeric not between 0 and 7
      or (plan->>'target')::numeric<>trunc((plan->>'target')::numeric)
      or coalesce(plan->>'companion','') not in ('Dragón','Cocodrilo','Oso','Lobo','Zorro','Ajolote','Tigre','Fénix') then
      raise exception 'Plan semanal inválido';
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.validate_pet_plan_profile() from public,anon,authenticated;
create trigger validate_pet_plan_profile before insert or update on public.training_items
  for each row execute function public.validate_pet_plan_profile();
