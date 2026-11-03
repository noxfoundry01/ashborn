-- Run once, manually, in the dedicated ASHBORN Supabase SQL editor after
-- all migrations, Auth, RLS and a manual tick have been verified.
create extension if not exists pg_cron;
select cron.schedule(
  'ashborn-world-tick',
  '*/5 * * * *',
  $$select public.run_scheduled_world_tick()$$
);
