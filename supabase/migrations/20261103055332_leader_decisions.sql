create table public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  slot bigint not null,
  status text not null default 'pending' check (status in ('pending','complete','failed')),
  action text,
  model text,
  response_id text,
  failure text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(agent_id,slot)
);
alter table public.agent_decisions enable row level security;
create policy "Completed decisions visible" on public.agent_decisions for select to anon, authenticated using (status = 'complete');
grant select on public.agent_decisions to anon, authenticated;
grant all on public.agent_decisions to service_role;

create or replace function public.execute_leader_decision(p_decision uuid,p_action text,p_note text,p_model text,p_response_id text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare d record; a record; v_event uuid; v_description text;
begin
  select * into d from public.agent_decisions where id=p_decision and status='pending' for update;
  if not found then raise exception 'Decision unavailable'; end if;
  select * into a from public.agents where id=d.agent_id and is_leader and not paused for update;
  if not found then raise exception 'Leader unavailable'; end if;
  if not ((a.faction='obsidian' and p_action in ('maintain','fortify')) or (a.faction='eden' and p_action in ('research','repair')) or (a.faction='havoc' and p_action in ('scout','dispatch'))) then raise exception 'Action not allowed for faction'; end if;
  if char_length(p_note) > 180 or char_length(p_model) > 80 or char_length(p_response_id) > 100 then raise exception 'Invalid provenance'; end if;
  v_description := a.name || ' chose to ' || case p_action when 'maintain' then 'maintain the power grid' when 'fortify' then 'reinforce the foundry' when 'research' then 'study a recovered archive' when 'repair' then 'repair the research wing' when 'scout' then 'survey the harbor route' else 'dispatch supplies across the island' end || '.';
  update public.agents set energy=greatest(0,energy-3),stability=least(100,stability+2),reputation=reputation+1,updated_at=now() where id=a.id;
  insert into public.world_events(agent_id,agent_name,faction,kind,description,provenance,event_key)
  values(a.id,a.name,a.faction,'leadership',v_description,'model_action','model:' || d.id::text) returning id into v_event;
  insert into public.agent_memories(agent_id,event_id,summary) values(a.id,v_event,left(v_description || ' ' || p_note,260));
  insert into public.chat_messages(agent_id,display_name,faction,body,is_agent)
  values(a.id,a.name,a.faction,v_description,true);
  update public.agent_decisions set status='complete',action=p_action,model=p_model,response_id=p_response_id,completed_at=now() where id=d.id;
  return v_event;
end $$;
revoke all on function public.execute_leader_decision(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.execute_leader_decision(uuid,text,text,text,text) to service_role;
