import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
import { signatureSchema } from "@/lib/finance";
import { associatedTokenAddress } from "@/lib/token-program";
import { requireDevnetGenesis } from "@/lib/solana-network";
const schema=z.object({quote_id:z.uuid(),signature:signatureSchema});
type ParsedIx={program?:string;programId?:PublicKey;parsed?:{type?:string;info?:Record<string,unknown>}|string};
export async function POST(request:Request){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid receipt"},{status:400});
  const db=adminDb();const {data:q}=await db.from("token_quotes").select("*").eq("id",parsed.data.quote_id).eq("user_id",user.id).eq("status","pending").maybeSingle();if(!q)return NextResponse.json({error:"Quote unavailable or consumed"},{status:409});
  try{
    const connection=new Connection(process.env.SOLANA_DEVNET_RPC_URL||"https://api.devnet.solana.com","finalized");
    requireDevnetGenesis(await connection.getGenesisHash());
    const tx=await connection.getParsedTransaction(parsed.data.signature,{commitment:"finalized",maxSupportedTransactionVersion:0});
    if(!tx||tx.meta?.err||!tx.blockTime||Number(tx.blockTime)*1000<new Date(q.created_at).getTime()-30_000||Number(tx.blockTime)*1000>new Date(q.expires_at).getTime())return NextResponse.json({error:"Transaction is not a finalized payment made within the quote window"},{status:409});
    const keys=tx.transaction.message.accountKeys;
    if(!keys.some(k=>k.pubkey.toBase58()===q.wallet&&k.signer))return NextResponse.json({error:"Linked wallet did not sign"},{status:403});
    const ixs=tx.transaction.message.instructions as ParsedIx[];
    const memo=ixs.filter(ix=>ix.program==="spl-memo"&&typeof ix.parsed==="string"&&ix.parsed===`ASHBORN:${q.id}`);
    const burns=ixs.filter(ix=>typeof ix.parsed==="object"&&ix.parsed.type==="burnChecked"&&ix.program==="spl-token");
    const transfers=ixs.filter(ix=>typeof ix.parsed==="object"&&ix.parsed.type==="transferChecked"&&ix.program==="spl-token");
    if(memo.length!==1||burns.length!==1||transfers.length!==(BigInt(q.treasury_amount)>0n?1:0)||ixs.some(ix=>ix.program==="spl-token"&&!(["burnChecked","transferChecked"].includes(typeof ix.parsed==="object"?ix.parsed.type??"":""))))return NextResponse.json({error:"Transaction instructions do not match quote"},{status:409});
    const burn=(burns[0].parsed as {info:Record<string,unknown>}).info;
    const source=(await associatedTokenAddress(new PublicKey(q.mint),new PublicKey(q.wallet))).toBase58();
    if(burn.mint!==q.mint||burn.authority!==q.wallet||burn.account!==source||Number((burn.tokenAmount as {decimals?:number}|undefined)?.decimals)!==Number(q.decimals)||BigInt(String(burn.amount))!==BigInt(q.burn_amount))return NextResponse.json({error:"Burn does not match quote"},{status:409});
    if(transfers.length){const t=(transfers[0].parsed as {info:Record<string,unknown>}).info;if(t.mint!==q.mint||t.authority!==q.wallet||t.source!==source||t.destination!==q.treasury_account||BigInt(String(t.tokenAmount&&typeof t.tokenAmount==="object"?(t.tokenAmount as {amount?:string}).amount:t.amount))!==BigInt(q.treasury_amount))return NextResponse.json({error:"Treasury transfer does not match quote"},{status:409})}
    const {data:balance,error}=await db.rpc("settle_token_quote",{p_quote:q.id,p_signature:parsed.data.signature});if(error)return NextResponse.json({error:"Receipt was already consumed or quote expired"},{status:409});
    return NextResponse.json({verified:true,network:"devnet",signature:parsed.data.signature,credits:q.credits,balance});
  }catch{return NextResponse.json({error:"Could not verify finalized devnet transaction"},{status:503})}
}
