create table public.agent_goals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  goal text not null check(char_length(goal) between 5 and 180),
  status text not null default 'active' check(status in ('active','completed','abandoned')),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  tick_id bigint not null references public.world_ticks(id) on delete cascade,
  profession text not null, outcome text not null,
  created_at timestamptz not null default now(),
  unique(agent_id,tick_id)
);
create table public.agent_skills (
  agent_id uuid not null references public.agents(id) on delete cascade,
  skill text not null, experience integer not null default 0 check(experience>=0),
  primary key(agent_id,skill)
);
create table public.agent_relationships (
  agent_id uuid not null references public.agents(id) on delete cascade,
  other_agent_id uuid not null references public.agents(id) on delete cascade,
  trust integer not null default 0 check(trust between -100 and 100),
  updated_at timestamptz not null default now(),
  primary key(agent_id,other_agent_id), check(agent_id<>other_agent_id)
);
alter table public.agent_goals enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.agent_skills enable row level security;
alter table public.agent_relationships enable row level security;
create policy "Owner reads goals" on public.agent_goals for select to authenticated using(exists(select 1 from public.agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
create policy "Owner reads jobs" on public.agent_jobs for select to authenticated using(exists(select 1 from public.agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
create policy "Owner reads skills" on public.agent_skills for select to authenticated using(exists(select 1 from public.agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
create policy "Owner reads relationships" on public.agent_relationships for select to authenticated using(exists(select 1 from public.agents a where a.id=agent_id and a.owner_id=(select auth.uid())));
grant select on public.agent_goals,public.agent_jobs,public.agent_skills,public.agent_relationships to authenticated;
grant all on public.agent_goals,public.agent_jobs,public.agent_skills,public.agent_relationships to service_role;

-- Distinct seeded motives; owner-created Souls are inserted by create_user_agent.
insert into public.agent_souls(agent_id,value,motivation,curiosity,ambition,sociability,caution)
select id,
  case faction when 'obsidian' then 'survival' when 'eden' then 'knowledge' else 'freedom' end,
  case faction when 'obsidian' then case when is_leader then 'Keep the reactor and power grid reliable.' else 'Make the foundry and energy grid resilient.' end
    when 'eden' then case when is_leader then 'Recover knowledge without repeating the war.' else 'Repair systems and preserve the human archive.' end
    else case when is_leader then 'Keep trade routes open and citizens free.' else 'Move supplies safely through the harbor.' end end,
  case faction when 'eden' then 86 when 'havoc' then 71 else 42 end,
  case faction when 'obsidian' then 75 when 'havoc' then 68 else 54 end,
  case faction when 'havoc' then 74 when 'eden' then 60 else 38 end,
  case faction when 'obsidian' then 84 when 'eden' then 68 else 43 end
from public.agents where owner_id is null
on conflict(agent_id) do nothing;
insert into public.agent_goals(agent_id,goal)
select id, case faction when 'obsidian' then 'Maintain a stable island power grid' when 'eden' then 'Restore the recovered archive' else 'Secure a safe harbor supply route' end
from public.agents where owner_id is null;
insert into public.agent_skills(agent_id,skill,experience)
select id,profession,case when is_leader then 100 else 0 end from public.agents;

create or replace function public.run_world_tick(p_slot bigint)
returns integer language plpgsql security invoker set search_path=public as $$
declare v_tick_id bigint; a record; v_event_id uuid; v_action text; v_count integer := 0;
begin
  if p_slot < 0 then raise exception 'Invalid slot'; end if;
  insert into public.world_ticks(slot) values(p_slot) on conflict(slot) do nothing returning id into v_tick_id;
  if v_tick_id is null then return 0; end if;
  for a in select id,name,faction,profession,energy,x,y,is_leader from public.agents where not paused and lifecycle<>'Dormant' order by id loop
    v_action := case a.profession when 'leader' then case a.faction when 'obsidian' then 'inspected the energy grid' when 'eden' then 'reviewed recovered research' else 'mapped a supply route' end
      when 'engineer' then 'maintained island infrastructure' when 'researcher' then 'catalogued recovered data'
      when 'scout' then 'surveyed a safe route' when 'courier' then 'delivered supplies' else 'repaired a citizen chassis' end;
    update public.agents set energy=greatest(25,least(100,energy+case when(p_slot+floor(x)::bigint)%4=0 then 4 else -2 end)),
      stability=least(100,stability+1),reputation=reputation+1,
      x=greatest(12,least(88,x+case when p_slot%2=0 then 0.4 else -0.4 end)),
      y=greatest(15,least(86,y+case when p_slot%3=0 then 0.3 else -0.3 end)),
      lifecycle=case when reputation>=500 then 'Legacy' when reputation>=180 then 'Evolution' when reputation>=50 then 'Adaptation' when lifecycle='Awakening' then 'Survival' else lifecycle end,
      updated_at=now() where id=a.id;
    insert into public.agent_jobs(agent_id,tick_id,profession,outcome) values(a.id,v_tick_id,a.profession,v_action);
    insert into public.agent_skills(agent_id,skill,experience) values(a.id,a.profession,1)
      on conflict(agent_id,skill) do update set experience=public.agent_skills.experience+1;
    if a.is_leader or (p_slot+floor(a.x)::bigint)%7=0 then
      insert into public.world_events(tick_id,agent_id,agent_name,faction,kind,description,provenance,event_key)
      values(v_tick_id,a.id,a.name,a.faction,'work',a.name||' '||v_action||'.','deterministic_tick',p_slot::text||':'||a.id::text)
      returning id into v_event_id;
      if exists(select 1 from public.agents where id=a.id and(owner_id is not null or is_leader)) then
        insert into public.agent_memories(agent_id,event_id,summary) values(a.id,v_event_id,v_action);
      end if;
      v_count:=v_count+1;
    end if;
  end loop;
  update public.world_ticks set completed_at=now() where id=v_tick_id;
  return v_count;
end $$;
revoke all on function public.run_world_tick(bigint) from public,anon,authenticated;
grant execute on function public.run_world_tick(bigint) to service_role;
