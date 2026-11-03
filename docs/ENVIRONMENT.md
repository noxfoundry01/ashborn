# Environment variables

Add these in Vercel Project Settings → Environment Variables for Production and Preview as appropriate. Redeploy after changing a build-time `NEXT_PUBLIC_` value. Never put secret values in Git, screenshots or chat. `.env.example` contains names and safe defaults only.

## Required for login and saved profiles

| Name | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | ASHBORN Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Public project key. It is protected by RLS, not a secret. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Server-side profile, agent, chat and worker mutations. Never use `NEXT_PUBLIC_` for this key. |

Auth also needs the Supabase Site URL and allowed `/auth/confirm` redirect. The app verifies access tokens through Supabase Auth before protected API actions. Profile rows are owner-readable; email is held by Supabase Auth.

## World and AI leaders

| Name | Default | Purpose |
| --- | --- | --- |
| `WORLD_TICK_SECRET` | Unset | Authenticates external `POST` world and AI workers. Use a long random value. |
| `CRON_SECRET` | Unset | Separate secret for Vercel Cron `GET` requests. |
| `WORLD_PAUSED` | `false` | Stops HTTP world workers when `true`. Database Cron uses its own control. |
| `OPENAI_API_KEY` | Unset | Server-only model API credential. Needed for actual AI leader decisions. |
| `ASHBORN_AGENT_MODEL` | `gpt-6-luna` | Model used by the leader runtime when enabled. |
| `AGENT_MODEL_ENABLED` | `false` | Must be `true` together with a key, scheduler and unpaused database control for model decisions. |
| `OPERATOR_USER_ID` | Unset | Supabase Auth UUID allowed to use operator routes. |

The deterministic simulation does not use `OPENAI_API_KEY`. AI leader requests are separate, disabled by default, capped and validated before they can affect world state. Setting a key alone does not schedule work.

## Wallet and staged payments

Wallet linking uses the signed address and the Supabase variables above. It requires no Solana RPC key or token mint. Current purchase rails are **devnet-only and disabled** until configured and tested.

| Names | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SOLANA_NETWORK`, `SOLANA_DEVNET_RPC_URL` | Devnet network gate and RPC. Use a dedicated RPC for sustained tests. |
| `NEXT_PUBLIC_ASHBORN_MINT`, `ASHBORN_MINT_DECIMALS`, `ASHBORN_TOKENS_PER_100_CREDITS`, `ASHBORN_BURN_BPS`, `ASHBORN_TREASURY_TOKEN_ACCOUNT`, `FINANCE_DEVNET_ENABLED` | ASHBORN token quote, signed burn and credit settlement test path. |
| `X402_USDC_MINT`, `X402_FACILITATOR_URL`, `X402_PAY_TO`, `X402_PRICE_USDC_BASE_UNITS`, `X402_DEVNET_ENABLED` | USDC x402 paid service test path. |

SOL and USDC game-resource checkout and all mainnet payment paths are not activated yet. They need explicit pricing, recipient and receipt verification before any enable switch is added.
