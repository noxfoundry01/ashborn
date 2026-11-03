# Deployment and scheduler setup

This guide prepares the existing code for Git, Vercel and a **dedicated ASHBORN Supabase project**. It does not activate payments.

Current development project: `cmfxfnuyczxmbwvamdxo` (`https://cmfxfnuyczxmbwvamdxo.supabase.co`). Its 14 migrations have already been applied and verified. The local migration filename versions match the remote history. Do not run the initial migrations again against this project. The steps below remain the reproducible procedure for a fresh environment.

## 1. Repository and runtime

- Push the application at the workspace root. The handoff folder and local secrets are ignored by `.gitignore`.
- Import the repository into Vercel with the root directory set to the repository root, Next.js framework detection, `npm ci` and `npm run build`.
- Select Node.js **24.x**. The package declares Node 24+ because its current Solana dependency tree requires it. [Vercel supports Node 24.x](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 2. Supabase before connected traffic

1. Create a new project for ASHBORN; do not reuse another product's database.
2. For a fresh project, apply every file in `supabase/migrations/` in filename order. Check that all migrations finish before entering database keys in Vercel. Files in `supabase/optional/` are separate activation steps and are not part of the initial migration run. Use `supabase db push` for future migrations so Git filenames and remote history stay aligned.
3. In Supabase Auth, set the production Site URL and allow `https://YOUR_DOMAIN/auth/confirm` as a redirect. Add `http://localhost:3000/auth/confirm` for local development. Configure an email sender and test an actual code and link.
4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel. Put `SUPABASE_SERVICE_ROLE_KEY` there as a **server-only** secret. Never prefix that secret with `NEXT_PUBLIC_` or put it in Git. The publishable key can be copied from Supabase Project Settings → API Keys; the service-role key must be copied directly into Vercel by an authorized operator.
5. Deploy, then check `GET /api/health`. `200 {"status":"ready"}` means the server can read the migrated database. A `503` is a setup or database failure and must be resolved before enabling the scheduler.
6. Test a separate user account: email sign-in, permanent faction choice, free Soul Core creation, public chat, report submission, map and Chronicle. Verify that one user cannot read another user's private Soul, inventory or wallet link.

## 3. Scheduled world execution

The recommended path on Vercel Hobby is **Supabase Cron for deterministic world ticks**. It calls a PostgreSQL function directly every five minutes, so it does not consume Vercel Cron intervals or require an HTTP secret. [Supabase documents this five-minute SQL schedule](https://supabase.com/docs/guides/cron/quickstart). The migration only creates the guarded function; it does not start a job.

After migration and Auth have been verified, test one tick in the dedicated ASHBORN SQL editor with `select public.run_scheduled_world_tick();`. Inspect `public.world_ticks`, `public.agent_jobs` and the Chronicle, then enable the extension and run `supabase/optional/enable_world_cron.sql`. The job calls `run_scheduled_world_tick()`, which checks the database `system_controls.world_paused` switch and uses the existing unique five-minute slot. Monitor the Supabase Cron job history and `public.world_ticks`. To stop it, set `world_paused=true` in the operator controls or run `supabase/optional/disable_world_cron.sql`. `WORLD_PAUSED` is a Vercel environment pause for HTTP workers and does **not** stop a database cron job.

For an external scheduler, set a long random `WORLD_TICK_SECRET` and make authenticated `POST` requests. If using Vercel Cron, set a **different** long random `CRON_SECRET`; Vercel sends `Authorization: Bearer <CRON_SECRET>` on its `GET` requests. Both HTTP endpoints reject missing and short secrets. The tick runs at most once per five-minute slot through a unique database key. [Vercel's Cron authentication contract](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

| Route | POST scheduler | Vercel Cron GET | Default state |
| --- | --- | --- | --- |
| `/api/internal/tick` | `WORLD_TICK_SECRET` | `CRON_SECRET` | Executes when database and secret exist. |
| `/api/internal/deliberate` | `WORLD_TICK_SECRET` | `CRON_SECRET` | Returns disabled until `AGENT_MODEL_ENABLED=true` and `OPENAI_API_KEY` are set. |

**Vercel Hobby:** Its built-in cron can run only once per day. Use Supabase Cron as above, or an external authenticated `POST` scheduler, for five-minute ticks. A daily Vercel Cron may later invoke `/api/internal/deliberate` if model decisions are enabled. Do not add a five-minute `vercel.json` cron on Hobby; deployment will fail. [Current Vercel limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

**Vercel Pro or Enterprise:** As an alternative to Supabase Cron, add this `vercel.json` at the repository root after the database is ready and set `CRON_SECRET`. Use one tick scheduler at a time. Cron jobs run on production deployments only and use UTC schedules. [Vercel Cron setup](https://vercel.com/docs/cron-jobs/quickstart).

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/internal/tick", "schedule": "*/5 * * * *" },
    { "path": "/api/internal/deliberate", "schedule": "0 */6 * * *" }
  ]
}
```

Until the hosting plan is known, `vercel.json` is intentionally absent from the root so the first deployment works on Hobby. Model decisions can be enabled later. Invocation times are not guaranteed to be exact, so monitor the last completed `world_ticks` row and worker logs.

## 4. Financial activation stays separate

Leave `FINANCE_DEVNET_ENABLED=false` and `X402_DEVNET_ENABLED=false` on the first deployment. Configure an approved **devnet** mint, burn ratio, treasury account, devnet USDC recipient and facilitator only after the database and identity flows pass. Execute a funded devnet wallet purchase and x402 payment; inspect finalized signatures, one-time ledger entries and delivery before changing either flag. The code contains no mainnet activation path.
