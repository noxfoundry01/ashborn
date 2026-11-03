-- Financial records are server controlled. All production activation flags default off.
create table public.wallet_challenges (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  wallet text not null, message text not null, expires_at timestamptz not null,
  consumed_at timestamptz, created_at timestamptz not null default now()
);
create table public.wallet_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet text not null unique, network text not null default 'devnet' check(network='devnet'),
  verified_at timestamptz not null default now()
);
create table public.token_quotes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  wallet text not null, mint text not null, decimals smallint not null check(decimals between 0 and 9),
  faction text not null check(faction in ('obsidian','eden','havoc')),
  token_amount bigint not null check(token_amount>0), burn_amount bigint not null check(burn_amount>0),
  treasury_amount bigint not null check(treasury_amount>=0), treasury_account text, credits integer not null check(credits>0),
  expires_at timestamptz not null, status text not null default 'pending' check(status in ('pending','settled','expired')),
  created_at timestamptz not null default now(),
  constraint quote_split check(token_amount=burn_amount+treasury_amount)
);
create table public.token_burns (
  id uuid primary key default gen_random_uuid(), quote_id uuid not null unique references public.token_quotes(id),
  signature text not null unique, wallet text not null, mint text not null, amount bigint not null check(amount>0),
  confirmed_at timestamptz not null default now()
);
create table public.game_balances (
  user_id uuid not null references auth.users(id) on delete cascade,
  faction text not null check(faction in ('obsidian','eden','havoc')),
  credits bigint not null default 0 check(credits>=0), primary key(user_id,faction)
);
create table public.game_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  faction text not null, delta bigint not null, reason text not null,
  quote_id uuid unique references public.token_quotes(id), created_at timestamptz not null default now()
);
create table public.service_orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null, network text not null check(network='devnet'),
  gross_usdc bigint not null check(gross_usdc>0), provider_usdc bigint not null check(provider_usdc>=0),
  platform_fee_usdc bigint not null check(platform_fee_usdc>=0), status text not null default 'pending' check(status in ('pending','settling','delivered','review')),
  prepared_output text,
  created_at timestamptz not null default now(),
  constraint order_split check(gross_usdc=provider_usdc+platform_fee_usdc)
);
create table public.x402_receipts (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.service_orders(id),
  transaction_signature text not null unique, facilitator_reference text,
  verified_at timestamptz not null default now()
);
create table public.service_deliveries (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.service_orders(id),
  output_text text not null, delivered_at timestamptz not null default now()
);
create table public.platform_fees (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.service_orders(id),
  gross_usdc bigint not null, provider_usdc bigint not null, platform_fee_usdc bigint not null,
  gateway_cost_usdc bigint not null default 0, net_fee_usdc bigint generated always as (platform_fee_usdc-gateway_cost_usdc) stored,
  created_at timestamptz not null default now()
);
create table public.buyback_proposals (
  id uuid primary key default gen_random_uuid(), proposed_usdc bigint not null check(proposed_usdc>0),
  status text not null default 'draft' check(status in ('draft','approved','rejected','executed')),
  operator_note text not null, approval_reference text, created_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['wallet_challenges','wallet_links','token_quotes','token_burns','game_balances','game_ledger','service_orders','x402_receipts','service_deliveries','platform_fees','buyback_proposals'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy "Owner reads wallet" on public.wallet_links for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads quotes" on public.token_quotes for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads balance" on public.game_balances for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads ledger" on public.game_ledger for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads orders" on public.service_orders for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads receipts" on public.x402_receipts for select to authenticated using(exists(select 1 from public.service_orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "Owner reads deliveries" on public.service_deliveries for select to authenticated using(exists(select 1 from public.service_orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "Owner reads burns" on public.token_burns for select to authenticated using(exists(select 1 from public.token_quotes q where q.id=quote_id and q.user_id=(select auth.uid())));
grant select on public.wallet_links, public.token_quotes, public.token_burns, public.game_balances, public.game_ledger, public.service_orders, public.x402_receipts, public.service_deliveries to authenticated;
grant all on public.wallet_challenges, public.wallet_links, public.token_quotes, public.token_burns, public.game_balances, public.game_ledger, public.service_orders, public.x402_receipts, public.service_deliveries, public.platform_fees, public.buyback_proposals to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.settle_token_quote(p_quote uuid,p_signature text)
returns bigint language plpgsql security invoker set search_path=public as $$
declare q record; v_balance bigint;
begin
  -- The route verifies onchain block time <= expires_at. A late HTTP retry can still
  -- claim a valid burn, so an expired wall clock must not strand paid users.
  select * into q from public.token_quotes where id=p_quote and status='pending' for update;
  if not found then raise exception 'Quote unavailable'; end if;
  if exists(select 1 from public.token_burns where signature=p_signature) then raise exception 'Transaction already consumed'; end if;
  insert into public.token_burns(quote_id,signature,wallet,mint,amount) values(q.id,p_signature,q.wallet,q.mint,q.burn_amount);
  insert into public.game_balances(user_id,faction,credits) values(q.user_id,q.faction,q.credits)
    on conflict(user_id,faction) do update set credits=public.game_balances.credits+excluded.credits
    returning credits into v_balance;
  insert into public.game_ledger(user_id,faction,delta,reason,quote_id) values(q.user_id,q.faction,q.credits,'verified_token_burn',q.id);
  update public.token_quotes set status='settled' where id=q.id;
  return v_balance;
end $$;
revoke all on function public.settle_token_quote(uuid,text) from public,anon,authenticated;
grant execute on function public.settle_token_quote(uuid,text) to service_role;

create or replace function public.settle_service_order(p_order uuid,p_signature text)
returns void language plpgsql security invoker set search_path=public as $$
declare o record;
begin
  select * into o from public.service_orders where id=p_order and status='settling' and prepared_output is not null for update;
  if not found then raise exception 'Order not ready'; end if;
  if exists(select 1 from public.x402_receipts where transaction_signature=p_signature) then raise exception 'Payment already recorded'; end if;
  insert into public.x402_receipts(order_id,transaction_signature) values(o.id,p_signature);
  insert into public.service_deliveries(order_id,output_text) values(o.id,o.prepared_output);
  insert into public.platform_fees(order_id,gross_usdc,provider_usdc,platform_fee_usdc) values(o.id,o.gross_usdc,o.provider_usdc,o.platform_fee_usdc);
  update public.service_orders set status='delivered' where id=o.id;
end $$;
revoke all on function public.settle_service_order(uuid,text) from public,anon,authenticated;
grant execute on function public.settle_service_order(uuid,text) to service_role;
