-- Supabase may grant broad public-schema privileges by default. Establish the
-- intended Data API surface explicitly; server routes use service_role.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles, public.agents, public.world_events,
  public.chat_messages, public.agent_decisions to anon, authenticated;

grant select on public.agent_souls, public.agent_soul_versions,
  public.agent_memories, public.chat_reports, public.wallet_links,
  public.token_quotes, public.token_burns, public.game_balances,
  public.game_ledger, public.service_orders, public.x402_receipts,
  public.service_deliveries, public.agent_goals, public.agent_jobs,
  public.agent_skills, public.agent_relationships, public.resource_balances,
  public.resource_purchases to authenticated;

grant insert on public.chat_reports to authenticated;
grant usage on sequence public.chat_reports_id_seq to authenticated;
