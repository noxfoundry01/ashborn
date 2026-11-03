# Architecture decisions

## ADR 001 — Application root

Application code lives at the repository root. Architecture inputs remain outside the deployed application.

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

## ADR 008 — Private account profile

Email belongs to Supabase Auth. The application profile stores only the account UUID, public display name and permanent faction. Public chat copies the chosen display name and faction into each message, so it does not need public profile-table reads. A restrictive SELECT policy requires `auth.uid() = id`; anonymous SELECT is revoked. The server verifies the access token and binds writes to its user ID. The protected profile view reports database loading failures instead of treating them as a new account.

## ADR 009 — Separate payment rails

ASHBORN-token credit purchases use a signed SPL burn and verified final receipt. SOL and USDC resource purchases will use direct, explicitly quoted Solana payments and server verification before idempotent fulfillment. x402 V2 is reserved for paid HTTP services and marketplace deliveries. The real ASHBORN token is intended for mainnet; all payment code currently available is devnet-only, disabled and awaiting funded tests. Mainnet needs separate mint, pricing, recipient, RPC, operational and security activation controls.
