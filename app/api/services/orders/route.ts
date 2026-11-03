import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { associatedTokenAddress, verifiedMint, verifiedTokenAccount } from "@/lib/token-program";
import { adminDb, requestUser } from "@/lib/supabase";
import { x402Config } from "@/lib/x402";
import { isPaused } from "@/lib/controls";
import { requireDevnetGenesis } from "@/lib/solana-network";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { DEVNET_CAIP2 } from "@/lib/x402";
export async function POST(request:Request){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const config=x402Config();if(!config)return NextResponse.json({error:"x402 devnet service is disabled"},{status:503});
  if(await isPaused("x402_paused"))return NextResponse.json({error:"x402 service is paused"},{status:503});
  try{const rpc=new Connection(process.env.SOLANA_DEVNET_RPC_URL||"https://api.devnet.solana.com","confirmed");requireDevnetGenesis(await rpc.getGenesisHash());const mint=await verifiedMint(rpc,new PublicKey(config.asset));if(mint.decimals!==6)throw new Error("USDC mint decimals mismatch");const recipient=await associatedTokenAddress(new PublicKey(config.asset),new PublicKey(config.payTo));const account=await verifiedTokenAccount(rpc,recipient);if(account.mint!==config.asset||account.owner!==config.payTo)throw new Error("Recipient account mismatch")}catch{return NextResponse.json({error:"Devnet USDC recipient is not ready"},{status:503})}
  try{const supported=await new HTTPFacilitatorClient({url:config.url,timeoutMs:5000}).getSupported();if(!supported.kinds.some(k=>k.network===DEVNET_CAIP2&&k.scheme==="exact"&&k.x402Version===2))throw new Error("Unsupported facilitator")}catch{return NextResponse.json({error:"Facilitator does not support Solana devnet x402 V2 exact payments"},{status:503})}
  const db=adminDb();const {data:events,error:eventsError}=await db.from("world_events").select("id").limit(1);if(eventsError||!events?.length)return NextResponse.json({error:"No verified Chronicle data is available for a paid brief"},{status:503});
  const {count}=await db.from("service_orders").select("id",{head:true,count:"exact"}).eq("user_id",user.id).gte("created_at",new Date(Date.now()-60_000).toISOString());if((count??0)>=3)return NextResponse.json({error:"Wait before creating another order"},{status:429});
  const {data,error}=await db.from("service_orders").insert({user_id:user.id,service_key:"chronicle_brief",network:"devnet",gross_usdc:config.amount,provider_usdc:"0",platform_fee_usdc:config.amount}).select("id").single();
  return error?NextResponse.json({error:"Order unavailable"},{status:503}):NextResponse.json({id:data.id,service:"Chronicle brief",price_usdc_base_units:config.amount,platform_fee_usdc_base_units:config.amount,network:"devnet",endpoint:`/api/services/chronicle-brief?order_id=${data.id}`},{status:201});
}
