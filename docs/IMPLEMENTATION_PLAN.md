# ASHBORN implementation plan

## Scope and milestones

- [x] M0: inspect the handoff, approved art, and LANDVILLE archive read-only; establish a new codebase.
- [x] M1: responsive cinematic landing, faction guide, accessible island, and honest Chronicle shell. Verified locally.
- [ ] M2: email OTP authentication, profile/faction identity, Soul Core creation and owner-only revision, persistent agent state, and public chat. Schema is live; hosted Auth and multi-user checks pending.
- [ ] M3: deterministic server ticks, three leaders and 27 residents, action provenance, jobs, memory, and a constrained model decision loop. Database tick and retry verified; recurring schedule and model decisions pending.
- [ ] M4: optional Solana wallet, devnet token quote and signed burn receipt; mainnet disabled by configuration. Code built; funded devnet test pending.
- [ ] M5: x402 V2 Solana USDC devnet paid service, receipt verification, idempotent fulfillment, fee ledger, and operator proposal queue. Code built; facilitator and payment test pending.
- [ ] M6: accessibility, security, performance, E2E, deployment and operational hardening. Database grants, RLS, advisor checks and indexes verified; production deployment and anonymous route checks pass; hosted Auth and E2E pending.

## Architecture

- Next.js App Router, React, strict TypeScript. Server routes/actions enforce identity and validation; React handles the island and chat UI.
- Supabase Auth for email OTP, PostgreSQL for durable state, RLS on every exposed table, Realtime for chat/events. No service-role secret in browser code.
- Deterministic world worker invoked by optional Supabase Cron or an authenticated HTTP scheduler. The unique tick key and append-only events make retries safe. Model decisions are a separate, capped, validated HTTP step.
- PixiJS stage for layered terrain, structures, routes and agents; accessible DOM landmark list and detail drawer use the same world state.
- Financial modules are separate from game state. No mainnet action without explicit network, verified mint, policy, owner approval and operational activation.

## Dependencies and environment

- Runtime: Node 24+ for supported Solana dependencies, Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, Zod, PixiJS, `@solana/web3.js` v3, `@solana-program/token`, `@solana/kit` and x402. Exact versions are pinned in `package-lock.json`.
- Development: TypeScript, ESLint, Vitest, Playwright when browser tests are feasible.
- External services: Supabase project and email delivery, scheduler, optional OpenAI key, Solana devnet RPC and test mint, optional x402 facilitator. The app must state when any are unconfigured.
- Deployment: a Node-compatible Next.js host plus a scheduled worker invocation; database migration applied first.

## LANDVILLE reference findings

The archive contains separate route modules, chronological SQL migrations, worker endpoints, agent jobs, world presence, chat provenance and treasury governance. These suggest useful *boundaries*: persisted actions before narration, idempotent jobs, and explicit approval gates. ASHBORN uses a fresh schema, original island art and UX, Solana rather than EVM, three factions and persistent autonomous identities. No archived source, text, imagery, EVM payment logic or token assumptions are copied.

## Risks and gates

- A local build cannot prove hosted email delivery, cross-browser Realtime, continuous 24-hour simulation, or devnet settlement. Each needs a configured environment and explicit verification.
- Token symbol, mint, supply, rate, burn percentage, USDC mint, facilitator, custody and buyback policy are owner decisions. Financial UI must remain disabled until these are supplied and tested.
- Mainnet activation requires separate owner approval, security and legal review. No production token deployment or market operations are in this milestone.
