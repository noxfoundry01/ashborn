import { NextResponse } from "next/server";
import { adminDb, requestUser } from "@/lib/supabase";
import { financeConfig } from "@/lib/finance";
import { Connection, PublicKey } from "@solana/web3.js";
import { verifiedMint, verifiedTokenAccount } from "@/lib/token-program";
import { isPaused } from "@/lib/controls";
import { requireDevnetGenesis } from "@/lib/solana-network";
export async function POST(request:Request){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const config=financeConfig();if(!config)return NextResponse.json({error:"Devnet credit purchases are disabled"},{status:503});
  if(await isPaused("finance_paused"))return NextResponse.json({error:"Credit purchases are paused"},{status:503});
  try { const rpc=new Connection(process.env.SOLANA_DEVNET_RPC_URL||"https://api.devnet.solana.com","confirmed");requireDevnetGenesis(await rpc.getGenesisHash());const mint=await verifiedMint(rpc,new PublicKey(config.mint));if(mint.decimals!==config.decimals)throw new Error("Mint decimals mismatch");if(config.treasury){const account=await verifiedTokenAccount(rpc,new PublicKey(config.treasury));if(account.mint!==config.mint)throw new Error("Treasury mint mismatch")}}catch{return NextResponse.json({error:"Devnet mint or treasury account could not be verified"},{status:503})}
  const db=adminDb();const [{data:wallet},{data:profile}]=await Promise.all([db.from("wallet_links").select("wallet").eq("user_id",user.id).maybeSingle(),db.from("profiles").select("faction").eq("id",user.id).maybeSingle()]);
  if(!wallet||!profile)return NextResponse.json({error:"Link a devnet wallet and choose a faction first"},{status:409});
  const {count}=await db.from("token_quotes").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","pending").gte("created_at",new Date(Date.now()-60_000).toISOString());if((count??0)>=3)return NextResponse.json({error:"Wait before requesting another quote"},{status:429});
  const {data,error}=await db.from("token_quotes").insert({user_id:user.id,wallet:wallet.wallet,mint:config.mint,decimals:config.decimals,faction:profile.faction,token_amount:config.amount.toString(),burn_amount:config.burn.toString(),treasury_amount:config.treasuryAmount.toString(),treasury_account:config.treasury,credits:100,expires_at:new Date(Date.now()+5*60_000).toISOString()}).select("id,expires_at").single();
  return error?NextResponse.json({error:"Quote unavailable"},{status:503}):NextResponse.json({id:data.id,network:"devnet",wallet:wallet.wallet,mint:config.mint,decimals:config.decimals,token_amount:config.amount.toString(),burn_amount:config.burn.toString(),treasury_amount:config.treasuryAmount.toString(),treasury_token_account:config.treasury,credits:100,faction:profile.faction,expires_at:data.expires_at});
}
