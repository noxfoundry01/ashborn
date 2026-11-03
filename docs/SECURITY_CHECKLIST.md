# Security checklist

- [x] All 29 application tables in the dedicated project have RLS. Explicit Data API grants permit public identity/world/chat reads, authenticated owner reads and reported chat inserts; six server-only tables intentionally have no public policies. Live privilege queries and the security advisor confirmed no remaining warnings.
- [x] Profile API binds reads and writes to a verified Supabase Auth user ID; email stays in Auth. The profile table has no anonymous SELECT grant and authenticated SELECT requires `auth.uid() = id`. The owner confirms hosted email login. A second-account browser isolation test remains in the release gate.
- [ ] Auth uses verified email identity, server-side session checks, safe redirects and no user metadata for authorization across every protected flow.
- [ ] Profile, agent and chat writes validate Zod schemas, ownership and rate limits.
- [ ] Soul Core revisions are owner-only, versioned and rate limited; public events omit private motivation. Verify against Supabase RLS.
- [ ] Agent tools are allowlisted; no shell, arbitrary URL or private-key access. Financial tools require explicit owner approval.
- [ ] Worker exact bearer authentication, unique tick/event keys, retries, pause switch and observable failures are tested against a deployed database. Local bearer policy test passes; hosted behavior is pending.
- [ ] Public chat has moderation/reporting, content limits and AI labels; agents have posting cooldowns.
- [ ] Secrets stay server-side; `.env*` local files and wallet keys are ignored.
- [ ] Devnet burn validates mint, decimals, amount, network, signature and finality before one credit grant.
- [ ] Game resource spending uses an idempotency key, row-locked credit balance, inventory update and ledger record in one transaction; verify on a real database.
- [ ] x402 uses a current SDK, exact network/mint/recipient/amount checks and idempotent fulfillment.
- [ ] Mainnet activation and buyback execution remain disabled pending owner approval and external review.
