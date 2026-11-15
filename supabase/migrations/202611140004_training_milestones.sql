alter table public.training_items add constraint reserve_milestone_ids
  check (kind <> 'session' or id not like 'mission:%') not valid;

create function public.grant_training_milestones(p_owner uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.session_rewards(owner, session_id, xp)
  select p_owner, 'mission:' || milestone.goal::text, 25
  from (values (1), (5), (10)) as milestone(goal)
  where milestone.goal <= (
    select count(*) from public.session_rewards
    where owner = p_owner and occurrence is not null
  )
  on conflict (owner, session_id) do nothing;
$$;
revoke all on function public.grant_training_milestones(uuid) from public, anon, authenticated;

create function public.on_training_milestone()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.grant_training_milestones(new.owner);
  return new;
end;
$$;
revoke all on function public.on_training_milestone() from public, anon, authenticated;
create trigger on_training_milestone after insert on public.session_rewards
  for each row when (new.occurrence is not null) execute function public.on_training_milestone();

select public.grant_training_milestones(owner)
from (select distinct owner from public.session_rewards where occurrence is not null) as athletes;
