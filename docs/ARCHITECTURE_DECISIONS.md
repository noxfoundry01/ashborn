# Architecture decisions

## ADR 001 — New repository root

The handoff lives under `ASHBORN_Codex_Handoff/ASHBORN_Codex_Handoff/`; application code is created at the workspace root. The ZIP stays closed and unchanged.

## ADR 002 — Supabase as authoritative store

Auth, profiles, agents, chat and events share PostgreSQL identity and transactions. RLS is defense in depth; server mutations also validate ownership, rate limits and input. Public views expose only safe fields. The service role belongs only in scheduled/server processes.

## ADR 003 — PixiJS over Phaser

The island is an explorable scene with stateful markers, not a physics game. PixiJS gives a smaller rendering abstraction for layered terrain and camera controls. HTML mirrors every selection for keyboard and reduced-motion access.

## ADR 004 — Deterministic ticks before LLM decisions

Every tick can run without model credentials, and is explicitly labeled deterministic simulation. A later model proposal must pass schema validation and server policy before state mutation. The model never writes to the database or signs transactions directly.

## ADR 005 — Finance gated by network and operator policy

Solana devnet is the only development network. Game resources are offchain, nonredeemable units. Payment and burn flows require real chain confirmations and idempotent receipts. Mainnet, treasury buybacks and discretionary spending default off.

## ADR 006 — Permanent faction identity and atomic resource spending

A profile's faction is fixed after its first save. Token quotes, game balances and resources are faction scoped; allowing later changes could strand paid credits. Resource purchases lock the credit row and write inventory, purchase receipt and ledger in one PostgreSQL transaction. A client request UUID makes network retries safe.

## ADR 007 — Remote migration versions and explicit Data API grants

The dedicated ASHBORN project was bootstrapped through the connected Supabase migration tool. It assigned migration versions at apply time, so the repository migration filenames were renamed to those exact versions without changing the 12 original SQL bodies. Future migrations should use `supabase db push` against this project to keep local and remote history aligned. The fresh project also granted broad table privileges by default. A hardening migration revokes those grants and restores only the public and owner-scoped reads the application needs; server mutations remain service-role-only.
