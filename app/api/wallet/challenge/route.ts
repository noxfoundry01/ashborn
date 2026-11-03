import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
export async function POST(request:Request){
  const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const parsed=z.object({wallet:z.string().min(32).max(44)}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid wallet"},{status:400});
  try{new PublicKey(parsed.data.wallet)}catch{return NextResponse.json({error:"Invalid wallet"},{status:400})}
  const db=adminDb();const expires=new Date(Date.now()+5*60_000).toISOString();
  const message=`ASHBORN wallet link\nUser: ${user.id}\nWallet: ${parsed.data.wallet}\nNonce: ${randomBytes(16).toString("hex")}\nExpires: ${expires}\nNetwork: devnet\nThis signature proves wallet ownership. It does not authorize a transaction.`;
  const {data,error}=await db.from("wallet_challenges").insert({user_id:user.id,wallet:parsed.data.wallet,message,expires_at:expires}).select("id").single();
  return error?NextResponse.json({error:"Could not create challenge"},{status:503}):NextResponse.json({challenge_id:data.id,message});
}
