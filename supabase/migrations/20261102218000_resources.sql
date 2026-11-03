-- Game-only resource purchases. Credits are nonredeemable and cannot move between users.
create table public.resource_balances (
  user_id uuid not null references auth.users(id) on delete cascade,
  faction text not null check(faction in ('obsidian','eden','havoc')),
  resource_key text not null check(resource_key in ('forge','synth','flux')),
  quantity bigint not null default 0 check(quantity>=0),
  primary key(user_id,faction,resource_key)
);
create table public.resource_purchases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  faction text not null check(faction in ('obsidian','eden','havoc')),
  resource_key text not null check(resource_key in ('forge','synth','flux')),
  quantity integer not null check(quantity between 1 and 10),
  credits_spent bigint not null check(credits_spent>0),
  created_at timestamptz not null default now()
);
alter table public.game_ledger add column purchase_id uuid unique references public.resource_purchases(id);
alter table public.resource_balances enable row level security;
alter table public.resource_purchases enable row level security;
create policy "Owner reads resources" on public.resource_balances for select to authenticated using(user_id=(select auth.uid()));
create policy "Owner reads resource purchases" on public.resource_purchases for select to authenticated using(user_id=(select auth.uid()));
grant select on public.resource_balances,public.resource_purchases to authenticated;
grant all on public.resource_balances,public.resource_purchases to service_role;

create or replace function public.purchase_game_resource(p_user uuid,p_request uuid,p_resource text,p_quantity integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_faction text; v_price bigint; v_cost bigint; v_balance bigint; v_quantity bigint; v_purchase uuid; old_purchase record;
begin
  if p_request is null or p_resource is null or p_quantity is null or p_resource not in ('forge','synth','flux') or p_quantity not between 1 and 10 then raise exception 'Invalid resource order'; end if;
  select id,user_id,resource_key,quantity,credits_spent into old_purchase from public.resource_purchases where request_id=p_request;
  if found then
    if old_purchase.user_id<>p_user
      or old_purchase.resource_key<>p_resource or old_purchase.quantity<>p_quantity then raise exception 'Request key already used'; end if;
    return jsonb_build_object('purchase_id',old_purchase.id,'quantity',old_purchase.quantity,'credits_spent',old_purchase.credits_spent,'replayed',true);
  end if;
  select faction into v_faction from public.profiles where id=p_user;
  if v_faction is null then raise exception 'Profile required'; end if;
  v_price := case p_resource when 'forge' then 15 when 'synth' then 25 else 35 end;
  v_cost := v_price*p_quantity;
  select credits into v_balance from public.game_balances where user_id=p_user and faction=v_faction for update;
  -- A concurrent request with the same key has completed while this one waited for the balance lock.
  select id,user_id,resource_key,quantity,credits_spent into old_purchase from public.resource_purchases where request_id=p_request;
  if found then
    if old_purchase.user_id<>p_user or old_purchase.resource_key<>p_resource or old_purchase.quantity<>p_quantity then raise exception 'Request key already used'; end if;
    return jsonb_build_object('purchase_id',old_purchase.id,'quantity',old_purchase.quantity,'credits_spent',old_purchase.credits_spent,'replayed',true);
  end if;
  if v_balance is null or v_balance<v_cost then raise exception 'Insufficient game credits'; end if;
  update public.game_balances set credits=credits-v_cost where user_id=p_user and faction=v_faction returning credits into v_balance;
  insert into public.resource_purchases(request_id,user_id,faction,resource_key,quantity,credits_spent)
    values(p_request,p_user,v_faction,p_resource,p_quantity,v_cost) returning id into v_purchase;
  insert into public.resource_balances(user_id,faction,resource_key,quantity) values(p_user,v_faction,p_resource,p_quantity)
    on conflict(user_id,faction,resource_key) do update set quantity=public.resource_balances.quantity+excluded.quantity
    returning quantity into v_quantity;
  insert into public.game_ledger(user_id,faction,delta,reason,purchase_id)
    values(p_user,v_faction,-v_cost,'resource_purchase:'||p_resource,v_purchase);
  return jsonb_build_object('purchase_id',v_purchase,'resource_key',p_resource,'quantity',v_quantity,'credits_spent',v_cost,'credits_remaining',v_balance,'replayed',false);
end $$;
revoke all on function public.purchase_game_resource(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.purchase_game_resource(uuid,uuid,text,integer) to service_role;
