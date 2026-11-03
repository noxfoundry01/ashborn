import { NextResponse } from "next/server";
import { adminDb, requestUser } from "@/lib/supabase";
export async function GET(request:Request){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const {data,error}=await adminDb().from("wallet_links").select("wallet,network,verified_at").eq("user_id",user.id).maybeSingle();return error?NextResponse.json({error:"Wallet unavailable"},{status:503}):NextResponse.json({wallet:data})}
