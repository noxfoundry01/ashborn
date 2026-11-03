"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/Session";
import { RESOURCE_CATALOG, type ResourceKey } from "@/lib/resources";

type MarketState={faction:string;credits:string;inventory:{resource_key:ResourceKey;quantity:string}[]};

export function ResourceMarket(){
  const {user,profile,api}=useSession();
  const [market,setMarket]=useState<MarketState|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [pending,setPending]=useState<{key:ResourceKey;requestId:string}|null>(null);
  const refresh=useCallback(async()=>{
    if(!user||!profile)return;
    try{const response=await api("/api/resources",{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error);setMarket(result)}
    catch(err){setNotice(err instanceof Error?err.message:"Inventory unavailable")}
  },[user,profile,api]);
  useEffect(()=>{queueMicrotask(()=>{void refresh()})},[refresh]);
  async function buy(key:ResourceKey){
    if(!market||busy||pending&&pending.key!==key)return;
    setBusy(true);setNotice("");
    const requestId=pending?.requestId??crypto.randomUUID();
    setPending({key,requestId});
    let retryable=true;
    try{
      const response=await api("/api/resources",{method:"POST",body:JSON.stringify({request_id:requestId,resource_key:key,quantity:1})});
      const result=await response.json();
      if(!response.ok){if(response.status===409){retryable=false;setPending(null)}throw new Error(result.error)}
      setPending(null);
      setNotice(result.replayed?"The earlier purchase was confirmed. Inventory refreshed.":`Purchased 1 ${key.toUpperCase()} for ${result.credits_spent} game credits.`);
      await refresh();
    }catch(err){setNotice(`${err instanceof Error?err.message:"Purchase could not be confirmed"}. ${retryable?"Retry uses the same request ID.":""}`)}
    finally{setBusy(false)}
  }
  return <section className="resource-market" aria-labelledby="resource-market-heading"><div className="section-row"><h2 id="resource-market-heading">ISLAND RESOURCES</h2><span>Game-only · no resale</span></div>
    <p>Spend faction game credits on persistent resources. The purchase deducts credits and updates inventory in one database transaction.</p>
    {!user?<p><Link href="/auth" className="text-link">Sign in to view your inventory ↗</Link></p>:!profile?<p><Link href="/profile" className="text-link">Choose a faction to open your inventory ↗</Link></p>:<>
      <p className="resource-balance">{market?BigInt(market.credits).toLocaleString():"—"} <span>AVAILABLE GAME CREDITS</span></p>
      <div className="resource-grid">{RESOURCE_CATALOG.map(item=>{const owned=market?.inventory.find(entry=>entry.resource_key===item.key)?.quantity??"0";return <article className="resource-card" key={item.key}><span className="eyebrow">{item.key.toUpperCase()} / {item.price} CREDITS</span><h3>{item.name}</h3><p>{item.description}</p><div className="resource-card-foot"><span>OWNED {owned}</span><button className="button ghost" disabled={!market||busy||(!pending&&BigInt(market.credits)<BigInt(item.price))||!!pending&&pending.key!==item.key} onClick={()=>{void buy(item.key)}}>{pending?.key===item.key?"Retry purchase":"Buy one"}</button></div></article>})}</div>
    </>}
    {notice&&<p role="status" className="form-message">{notice}</p>}
  </section>;
}
