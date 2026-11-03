# ASHBORN status

Updated: 2026-11-03 (Europe/Madrid)

## Implemented in the new application

| Area | Current state |
| --- | --- |
| Landing and lore | Responsive cinematic landing, approved logo, three original faction identities, faction guide and navigation. |
| Island | Interactive PixiJS 2.5D scene with camera pan/zoom, layered terrain, landmarks and agent markers; DOM controls mirror map selection. Offline seed data is labeled as preview. |
| Identity | Supabase email OTP screens and callback, authenticated session, saved profile and permanent faction choice. The owner reports live email sign-in works. Profile reads are now restricted to the owner in the connected database; the authenticated profile save flow awaits a fresh browser check after deployment. |
| Agents and world | Soul Core form, owner-only revisions with version history, three seeded leaders and 27 residents, deterministic idempotent ticks, goals, jobs, skills, memories, relationships, lifecycle phases and Chronicle events. Constrained AI leader proposals require an explicit enable flag and model key. |
| Social | Global chat API and Realtime UI with faction names, human/agent attribution, rate limits and reports. Deterministic worker shift reports are limited to one per faction per hour; chat labels simulation and model origins separately. Live multi-user behavior awaits Supabase verification. |
| Token and resources | Optional Solana wallet challenge/signature link, devnet-only token quote, wallet-signed BurnChecked/TransferChecked, finalized receipt checks and atomic credit ledger. Exchange resource catalog, authenticated inventory and atomic, idempotent credit spending are implemented. Wallet signing is chain-neutral; the existing database link retains a devnet marker until the schema is upgraded. Token purchases are disabled by default; no mint or funded wallet configured. SOL/USDC resource checkout is not implemented. |
| x402 | Devnet USDC order, x402 V2 exact payment, facilitator compatibility check, settlement hook, receipt/delivery/fee records and operator proposals. Disabled by default; no facilitator or USDC recipient configured. |
| Controls | Operator pause flags, optional Supabase Cron entry point, separate manual and Vercel Cron worker secrets, bounded worker route durations, deployment health endpoint, allowlisted agent actions, no mainnet activation path. |

## Built in the latest phase

- `supabase/migrations/20261103064107_private_profiles.sql`, `app/api/profile/route.ts`, `components/Session.tsx`, `app/profile/page.tsx`: owner-only profile reads, separate create/update paths, visible saved state and retryable profile loading errors. Public chat keeps its own attributed display name and faction.
- `docs/ENVIRONMENT.md`: exact Supabase, world/AI, wallet and payment variables with activation boundaries. `README.md` now has a concise public-facing product overview and current release status.
- `docs/ashborn-launch-island.png` and `docs/LAUNCH_POST.md`: original concept art and an unpublished first lore post draft.
- Wallet UI now labels signing as a Solana wallet link without implying that the link itself moves funds or depends on a devnet balance. The devnet purchase path remains explicitly labeled.

- `lib/worker-auth.ts`, `app/api/internal/{tick,deliberate}/route.ts`: exact bearer checking, authenticated POST scheduler and GET Vercel Cron entry points. Leader model calls run concurrently within a capped request.
- `supabase/migrations/20261103055346_chat_provenance.sql`, `app/api/chat/route.ts`, `app/chat/page.tsx`: stored chat origin and deterministic shift reports from persisted agent jobs.
- `app/api/health/route.ts`, `docs/DEPLOYMENT.md`: database readiness probe and concrete Vercel/Supabase setup, including Hobby scheduler limits.
- `supabase/migrations/20261103055348_soul_revision.sql`, `app/api/agents/[id]/soul/route.ts`, `app/agents/[id]/page.tsx`: private Soul Core editor, atomic revision history, per-day limit and a public Chronicle entry that omits private guidance.
- `supabase/migrations/20261103055349_supabase_cron_entry.sql`, `supabase/optional/enable_world_cron.sql`, `supabase/optional/disable_world_cron.sql`: optional five-minute database scheduler that respects `system_controls.world_paused`. It is not active until manually enabled.
- `supabase/migrations/20261103055507_security_indexes.sql` and `20261103055716_table_grants.sql`: revoke public execution of the project-installed RLS event trigger, cover 17 foreign keys, and restrict Data API grants to intended tables and roles.

## Verification completed

- Project instructions and documents read; approved art inspected. Architecture inputs remained read-only and no archived product code or art was copied.
- `npm run typecheck`, `npm run lint -- --quiet`, `npm test` (9 tests) and `npm run build` pass on this machine.
- The same four checks pass after the profile and wallet copy changes. On this Windows machine, `next build` needed an elevated process to write its local `.next` cache; the build then completed successfully.
- `npm audit --omit=dev` reports **0 production vulnerabilities** after replacing the legacy SPL Token package.
- Browser QA previously confirmed landing/map rendering, landmark selection, mobile width without overflow and disabled Exchange messaging; no browser console error in that pass.
- Local API smoke checks: offline world endpoint responds, credit config reports disabled, x402 route returns 503 while disabled, unauthorized worker returns 403.
- Dedicated Supabase project `cmfxfnuyczxmbwvamdxo` is active. All 15 migrations, including the private-profile policy, were applied through the connected account. Local migration filenames match the remote versions; the 12 originally prepared SQL bodies were not altered.
- Profile policy verification: `anon` has no `SELECT` grant on `profiles`; the `authenticated` role has `SELECT` with a restrictive `auth.uid() = id` policy. No profile rows were present when this policy was applied. A second-user browser isolation check remains.
- Live database checks: 29 public tables all have RLS; 30 seeded agents, Soul Cores, goals and skills; finance and x402 pause flags are true. Public chat/world reads and private authenticated reads have explicit grants; anonymous Soul, control and chat-write grants are absent. All three Realtime tables are published.
- One manual world tick completed with 30 jobs, 9 deterministic Chronicle events and 3 leader memories. Retrying the same slot returned 0. Supabase Cron is not installed or scheduled yet.
- Security advisor has no warnings after hardening. Its six informational policyless-table notices are intentional server-only tables. The performance advisor reports only unused indexes on this fresh database.
- Vercel production deployment at `https://ashborn-five.vercel.app/` serves the landing and island (`200`). Hosted `/api/health` returns `200 {"status":"ready"}`; `/api/world` reads persisted agents and `/api/chat` is configured. Anonymous profile and agent APIs return `401`, the unsigned worker route returns `403`, and credit configuration remains disabled on devnet. GitHub reports the deployment status as successful for commit `e3e8276`.

## Integration gates

1. Supabase schema is live and Vercel database configuration passes `/api/health`. Keep the server key in Vercel only; do not put it in Git or chat.
2. The owner reports email login works. Confirm Auth Site URL and exact `/auth/confirm` redirects, then verify profile creation and reload after this deployment, Soul Core creation and revision, chat Realtime, report submission and multi-user isolation.
3. Enable Supabase Cron manually after hosted Auth verification, or configure an authenticated HTTP scheduler. Vercel Hobby cannot run a five-minute cron. Run ticks and leader decisions over time, check retry and pause behavior and inspect Chronicle/chat provenance.
4. Test wallet message signing after hosted profile creation. Supply an approved **devnet** test mint, decimals, token price, burn share and any treasury token account. Test one-time settlement with a funded devnet wallet before enabling purchases. The real token is intended for Solana mainnet, which has no activation path yet.
5. Supply devnet USDC mint, recipient associated token account, price and x402 facilitator. Test a real payment, duplicate payment handling, delivery and fee ledger before enabling orders.
6. Define exact products, prices, recipient addresses and verification requirements for separate SOL and USDC game-resource checkout. Implement and test these rails independently from x402 paid services.
7. Run browser E2E, accessibility and deployment checks in a Node 24+ environment. The development machine currently uses Node 22; the app builds here, but `@solana-program/stake` declares Node 24+.

No live token, production payment, mainnet operation or autonomous hosted worker is claimed. Finance and model execution remain disabled until configured.
