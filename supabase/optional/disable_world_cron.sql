-- Stops scheduled ticks; run only if ashborn-world-tick was enabled.
select cron.unschedule('ashborn-world-tick');
