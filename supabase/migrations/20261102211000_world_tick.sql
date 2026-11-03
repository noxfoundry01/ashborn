-- Called by a server-only scheduled route using the service role. No model calls or financial actions.
create or replace function public.run_world_tick(p_slot bigint)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare v_tick_id bigint; a record; v_event_id uuid; v_action text; v_count integer := 0;
begin
  if p_slot < 0 then raise exception 'Invalid slot'; end if;
  insert into public.world_ticks(slot) values (p_slot) on conflict (slot) do nothing returning id into v_tick_id;
  if v_tick_id is null then return 0; end if;
  for a in select id,name,faction,profession,energy,x,y,is_leader from public.agents where not paused and lifecycle <> 'Dormant' order by id loop
    v_action := case a.profession when 'leader' then case a.faction when 'obsidian' then 'inspected the energy grid' when 'eden' then 'reviewed recovered research' else 'mapped a supply route' end when 'engineer' then 'maintained island infrastructure' when 'researcher' then 'catalogued recovered data' when 'scout' then 'surveyed a safe route' when 'courier' then 'delivered supplies' else 'repaired a citizen chassis' end;
    update public.agents set
      energy = greatest(25, least(100, energy + case when (p_slot + floor(x)::bigint) % 4 = 0 then 4 else -2 end)),
      stability = least(100, stability + 1),
      reputation = reputation + 1,
      x = greatest(12,least(88,x + case when p_slot % 2 = 0 then 0.4 else -0.4 end)),
      y = greatest(15,least(86,y + case when p_slot % 3 = 0 then 0.3 else -0.3 end)),
      lifecycle = case when reputation >= 500 then 'Legacy' when reputation >= 180 then 'Evolution' when reputation >= 50 then 'Adaptation' when lifecycle = 'Awakening' then 'Survival' else lifecycle end,
      updated_at = now()
    where id = a.id;
    -- A sparse factual Chronicle. Every tick still changes persisted agent position/stats.
    if a.is_leader or (p_slot + floor(a.x)::bigint) % 7 = 0 then
      insert into public.world_events(tick_id,agent_id,agent_name,faction,kind,description,provenance,event_key)
      values (v_tick_id,a.id,a.name,a.faction,'work',a.name || ' ' || v_action || '.','deterministic_tick',p_slot::text || ':' || a.id::text)
      returning id into v_event_id;
      if exists(select 1 from public.agents where id=a.id and owner_id is not null) then
        insert into public.agent_memories(agent_id,event_id,summary) values(a.id,v_event_id,v_action);
      end if;
      v_count := v_count + 1;
    end if;
  end loop;
  update public.world_ticks set completed_at=now() where id=v_tick_id;
  return v_count;
end $$;
revoke all on function public.run_world_tick(bigint) from public, anon, authenticated;
grant execute on function public.run_world_tick(bigint) to service_role;
