# ASHBORN

A new, original Next.js application for a persistent island civilization. The handoff package remains under `ASHBORN_Codex_Handoff/`; the LANDVILLE ZIP is an untouched architectural reference.

## Run locally

1. Use Node 24 or newer for a supported Solana dependency runtime. Run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and a long random `WORLD_TICK_SECRET` for connected features. The service role is used by server routes and workers and must stay server-side. Never commit `.env.local`.
3. Apply `supabase/migrations/*.sql` in filename order to a **new ASHBORN Supabase project**. Configure Auth Site URL and redirect URL `http://localhost:3000/auth/confirm`; set the email template to send a link or one-time code. Enable Realtime for the project.
4. Run `npm run dev`, open `http://localhost:3000`.
5. For local HTTP scheduling, invoke `POST /api/internal/tick` every five minutes with `Authorization: Bearer $WORLD_TICK_SECRET`. A second scheduler can call `POST /api/internal/deliberate` every six hours after `AGENT_MODEL_ENABLED=true` and `OPENAI_API_KEY` are set. The route itself de-duplicates by time slot. Set `WORLD_PAUSED=true` to stop HTTP workers. For Vercel Hobby, the optional Supabase Cron path in `docs/DEPLOYMENT.md` drives ticks inside PostgreSQL and uses the database operator pause switch.

Without Supabase credentials, the landing and explorable island render, while connected features visibly say they are offline. The app never fabricates world events or transactions.

The Exchange resource shop uses nonredeemable faction game credits. One FORGE costs 15 credits, one SYNTH costs 25 and one FLUX costs 35. Each authenticated purchase has a unique request ID, locks the balance and writes the inventory and ledger atomically. It becomes usable after the ASHBORN database is configured and credits have been acquired on devnet.

## Financial activation

All finance defaults off. Devnet credit purchases require `FINANCE_DEVNET_ENABLED=true`, a verified `NEXT_PUBLIC_ASHBORN_MINT`, onchain decimals in `ASHBORN_MINT_DECIMALS`, an approved `ASHBORN_TOKENS_PER_100_CREDITS`, approved `ASHBORN_BURN_BPS` (1–10000), and `ASHBORN_TREASURY_TOKEN_ACCOUNT` if the burn share is below 100%. `SOLANA_DEVNET_RPC_URL` must reach devnet. A wallet holder signs each BurnChecked transaction; the server checks finalized instructions and settles one quote once. **This flow has not been tested on devnet without a token mint and funded wallet.** Do not activate it until an end-to-end test passes.

x402 USDC services remain disabled. The database has separate order, receipt, delivery, fee and proposal records, but no payment route is advertised until a facilitator, USDC mint, recipient account, price and settlement tests are in place. Mainnet is not supported by any environment flag in this build.

## Checks

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. See `docs/STATUS.md` for verified results and remaining integration gates.

For Vercel, Supabase, Auth URLs and scheduler setup, see `docs/DEPLOYMENT.md`. No Vercel cron is activated by this repository until the hosting plan and secrets are configured.
