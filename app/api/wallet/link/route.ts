import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
const schema=z.object({challenge_id:z.uuid(),signature:z.string().min(70).max(120)});
export async function POST(request:Request){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid signature"},{status:400});
  const db=adminDb();const {data:challenge}=await db.from("wallet_challenges").select("id,wallet,message,expires_at,consumed_at").eq("id",parsed.data.challenge_id).eq("user_id",user.id).maybeSingle();
  if(!challenge||challenge.consumed_at||new Date(challenge.expires_at).getTime()<=Date.now())return NextResponse.json({error:"Challenge expired"},{status:409});
  let valid=false;try{valid=nacl.sign.detached.verify(new TextEncoder().encode(challenge.message),bs58.decode(parsed.data.signature),new PublicKey(challenge.wallet).toBytes())}catch{valid=false}
  if(!valid)return NextResponse.json({error:"Wallet signature did not match"},{status:403});
  const {data:consumed,error:consumeError}=await db.from("wallet_challenges").update({consumed_at:new Date().toISOString()}).eq("id",challenge.id).is("consumed_at",null).select("id").maybeSingle();
  if(consumeError||!consumed)return NextResponse.json({error:"Challenge already used"},{status:409});
  const {error}=await db.from("wallet_links").upsert({user_id:user.id,wallet:challenge.wallet,network:"devnet",verified_at:new Date().toISOString()});
  return error?NextResponse.json({error:"Wallet is already linked to another account"},{status:409}):NextResponse.json({wallet:challenge.wallet,network:"devnet"});
}
