-- Entry point for an optional Supabase Cron job. Scheduling is a separate,
-- explicit activation step in supabase/optional/enable_world_cron.sql.
create or replace function public.run_scheduled_world_tick()
returns integer language plpgsql security invoker set search_path=public as $$
declare v_paused boolean;
begin
  select world_paused into v_paused from public.system_controls where id=1;
  if not found then raise exception 'Operator controls unavailable'; end if;
  if v_paused then return 0; end if;
  return public.run_world_tick(floor(extract(epoch from clock_timestamp()) / 300)::bigint);
end $$;
revoke all on function public.run_scheduled_world_tick() from public,anon,authenticated;
grant execute on function public.run_scheduled_world_tick() to service_role;
