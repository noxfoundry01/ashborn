create table public.system_controls (
  id smallint primary key default 1 check(id=1),
  world_paused boolean not null default false,
  model_paused boolean not null default true,
  finance_paused boolean not null default true,
  x402_paused boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.system_controls(id) values(1);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.system_controls enable row level security;
alter table public.audit_logs enable row level security;
grant all on public.system_controls, public.audit_logs to service_role;
grant usage, select on all sequences in schema public to service_role;
