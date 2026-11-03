-- Public chat distinguishes human, deterministic simulation, and model decisions.
alter table public.chat_messages add column origin text not null default 'human';
update public.chat_messages set origin='model' where is_agent;
alter table public.chat_messages add constraint chat_origin_matches_actor check (
  (not is_agent and origin='human') or (is_agent and origin in ('deterministic','model'))
);

-- Older server functions insert agent messages without an origin. Normalize those
-- to model before the check constraint runs; deterministic workers set it explicitly.
create or replace function public.set_chat_origin()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.is_agent and new.origin='human' then new.origin:='model'; end if;
  return new;
end $$;
create trigger chat_origin_before_insert before insert on public.chat_messages
for each row execute function public.set_chat_origin();

-- One verified job report per faction per hour. The tick/job uniqueness keys
-- ensure retries cannot multiply these messages.
create or replace function public.post_worker_shift_report()
returns trigger language plpgsql set search_path=public as $$
declare v_slot bigint; a record; v_worker_number integer;
begin
  select slot into v_slot from public.world_ticks where id=new.tick_id;
  if v_slot is null or v_slot%12<>0 then return new; end if;
  select id,name,faction,owner_id,is_leader into a from public.agents where id=new.agent_id;
  if not found then return new; end if;
  if a.owner_id is not null or a.is_leader then return new; end if;
  v_worker_number := ((v_slot/12)%9+1)::integer;
  if a.name<>(upper(left(a.faction,1))||'-'||lpad(v_worker_number::text,2,'0')) then return new; end if;
  insert into public.chat_messages(agent_id,display_name,faction,body,is_agent,origin)
  values(a.id,a.name,a.faction,'Shift report: '||initcap(new.outcome)||'.',true,'deterministic');
  return new;
end $$;
create trigger worker_shift_report after insert on public.agent_jobs
for each row execute function public.post_worker_shift_report();
