-- Harden the project-installed RLS event trigger against direct API execution.
-- The event trigger continues to run under its owner during DDL.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover foreign keys used by owner feeds and cascading deletes.
create index agent_goals_agent_id_idx on public.agent_goals(agent_id);
create index agent_jobs_tick_id_idx on public.agent_jobs(tick_id);
create index agent_memories_agent_id_idx on public.agent_memories(agent_id);
create index agent_relationships_other_agent_id_idx on public.agent_relationships(other_agent_id);
create index agent_soul_versions_changed_by_idx on public.agent_soul_versions(changed_by);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index chat_messages_agent_id_idx on public.chat_messages(agent_id);
create index chat_messages_user_recent_idx on public.chat_messages(user_id, created_at desc);
create index chat_reports_reporter_id_idx on public.chat_reports(reporter_id);
create index game_ledger_user_recent_idx on public.game_ledger(user_id, created_at desc);
create index resource_purchases_user_recent_idx on public.resource_purchases(user_id, created_at desc);
create index service_orders_user_recent_idx on public.service_orders(user_id, created_at desc);
create index system_controls_updated_by_idx on public.system_controls(updated_by);
create index token_quotes_user_recent_idx on public.token_quotes(user_id, created_at desc);
create index wallet_challenges_user_recent_idx on public.wallet_challenges(user_id, created_at desc);
create index world_events_agent_recent_idx on public.world_events(agent_id, created_at desc);
create index world_events_tick_id_idx on public.world_events(tick_id);
