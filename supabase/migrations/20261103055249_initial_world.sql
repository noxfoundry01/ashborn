-- ASHBORN fresh schema. Apply with Supabase CLI before serving connected features.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  faction text not null check (faction in ('obsidian','eden','havoc')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 24),
  faction text not null check (faction in ('obsidian','eden','havoc')),
  profession text not null check (profession in ('leader','engineer','researcher','scout','courier','medic')),
  chassis text not null default 'sentinel',
  is_leader boolean not null default false,
  lifecycle text not null default 'Awakening' check (lifecycle in ('Awakening','Survival','Adaptation','Evolution','Legacy','Dormant')),
  energy integer not null default 90 check (energy between 0 and 100),
  integrity integer not null default 100 check (integrity between 0 and 100),
  stability integer not null default 90 check (stability between 0 and 100),
  reputation integer not null default 0,
  x numeric(5,2) not null check (x between 0 and 100),
  y numeric(5,2) not null check (y between 0 and 100),
  public_chat boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leader_unowned check (not is_leader or owner_id is null)
);
create unique index one_free_agent_per_owner on public.agents(owner_id) where owner_id is not null;
create index agents_faction_idx on public.agents(faction);
create table public.agent_souls (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  version integer not null default 1,
  value text not null check (value in ('loyalty','freedom','knowledge','survival')),
  motivation text not null check (char_length(motivation) between 5 and 180),
  curiosity integer not null check (curiosity between 0 and 100),
  ambition integer not null check (ambition between 0 and 100),
  sociability integer not null check (sociability between 0 and 100),
  caution integer not null check (caution between 0 and 100),
  updated_at timestamptz not null default now()
);
create table public.agent_soul_versions (
  id bigint generated always as identity primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  version integer not null,
  soul jsonb not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(agent_id, version)
);
create table public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  event_id uuid not null unique,
  summary text not null,
  created_at timestamptz not null default now()
);
create table public.world_ticks (
  id bigint generated always as identity primary key,
  slot bigint not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.world_events (
  id uuid primary key default gen_random_uuid(),
  tick_id bigint references public.world_ticks(id),
  agent_id uuid references public.agents(id) on delete set null,
  agent_name text,
  faction text check (faction in ('obsidian','eden','havoc')),
  kind text not null,
  description text not null,
  provenance text not null check (provenance in ('deterministic_tick','user_action','model_action','chain_verified')),
  event_key text unique,
  created_at timestamptz not null default now()
);
alter table public.agent_memories add constraint agent_memories_event_fk foreign key(event_id) references public.world_events(id) on delete cascade;
create index world_events_recent_idx on public.world_events(created_at desc);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  display_name text not null,
  faction text not null check (faction in ('obsidian','eden','havoc')),
  body text not null check (char_length(body) between 1 and 500),
  is_agent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_actor check ((user_id is not null and agent_id is null and not is_agent) or (user_id is null and agent_id is not null and is_agent))
);
create index chat_recent_idx on public.chat_messages(created_at desc);
create table public.chat_reports (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','abuse','other')),
  created_at timestamptz not null default now(),
  unique(message_id, reporter_id)
);

alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.agent_souls enable row level security;
alter table public.agent_soul_versions enable row level security;
alter table public.agent_memories enable row level security;
alter table public.world_ticks enable row level security;
alter table public.world_events enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;

create policy "Profiles are public identities" on public.profiles for select to anon, authenticated using (true);
create policy "Owner creates profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Owner edits profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Agents are visible" on public.agents for select to anon, authenticated using (true);
create policy "Owner creates agent" on public.agents for insert to authenticated with check ((select auth.uid()) = owner_id and not is_leader and not paused and energy = 90 and integrity = 100 and stability = 90 and reputation = 0);
create policy "Owner reads soul" on public.agent_souls for select to authenticated using (exists(select 1 from public.agents a where a.id = agent_id and a.owner_id = (select auth.uid())));
create policy "Owner creates soul" on public.agent_souls for insert to authenticated with check (exists(select 1 from public.agents a where a.id = agent_id and a.owner_id = (select auth.uid())));
create policy "Owner reads soul versions" on public.agent_soul_versions for select to authenticated using (exists(select 1 from public.agents a where a.id = agent_id and a.owner_id = (select auth.uid())));
create policy "Owner records soul version" on public.agent_soul_versions for insert to authenticated with check (changed_by = (select auth.uid()) and exists(select 1 from public.agents a where a.id = agent_id and a.owner_id = (select auth.uid())));
create policy "Owner reads memories" on public.agent_memories for select to authenticated using (exists(select 1 from public.agents a where a.id = agent_id and a.owner_id = (select auth.uid())));
create policy "Public events" on public.world_events for select to anon, authenticated using (true);
create policy "Public chat" on public.chat_messages for select to anon, authenticated using (true);
create policy "Members report chat" on public.chat_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "Reporter reads report" on public.chat_reports for select to authenticated using (reporter_id = (select auth.uid()));

grant select on public.profiles, public.agents, public.world_events, public.chat_messages to anon, authenticated;
grant select on public.agent_souls, public.agent_soul_versions, public.agent_memories, public.chat_reports to authenticated;
grant insert on public.chat_reports to authenticated;
grant all on public.profiles, public.agents, public.agent_souls, public.agent_soul_versions, public.agent_memories, public.world_ticks, public.world_events, public.chat_messages, public.chat_reports to service_role;
grant usage, select on all sequences in schema public to service_role;

-- All chat writes go through the server route with a verified JWT and service role.
revoke insert, update, delete on public.profiles, public.agents, public.agent_souls, public.agent_soul_versions, public.chat_messages from anon, authenticated;
revoke update, delete on public.world_events from anon, authenticated;

do $$
declare f text; leader_name text; worker_name text; i integer; px numeric; py numeric;
begin
  foreach f in array array['obsidian','eden','havoc'] loop
    leader_name := case f when 'obsidian' then 'NOX' when 'eden' then 'EVE' else 'RAZE' end;
    insert into public.agents(name,faction,profession,chassis,is_leader,lifecycle,x,y)
    values (leader_name,f,'leader',case f when 'obsidian' then 'sentinel' when 'eden' then 'weaver' else 'ranger' end,true,'Evolution',case f when 'obsidian' then 29 when 'eden' then 70 else 40 end,case f when 'havoc' then 76 else 35 end);
    for i in 1..9 loop
      worker_name := upper(left(f,1)) || '-' || lpad(i::text,2,'0');
      px := case f when 'obsidian' then 18+i*2 when 'eden' then 60+i*2 else 30+i*3 end;
      py := case f when 'havoc' then 66+(i%3)*4 else 26+(i%3)*5 end;
      insert into public.agents(name,faction,profession,chassis,lifecycle,x,y)
      values (worker_name,f,(array['engineer','researcher','scout','courier','medic'])[((i-1)%5)+1],case f when 'obsidian' then 'sentinel' when 'eden' then 'weaver' else 'ranger' end,'Survival',px,py);
    end loop;
  end loop;
end $$;

-- Enable realtime publication for persisted world and chat changes.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.world_events;
alter publication supabase_realtime add table public.agents;
