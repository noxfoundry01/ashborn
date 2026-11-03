import { NextResponse } from "next/server";
import { adminDb, isConfigured } from "@/lib/supabase";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=5;

export async function GET(){
  const headers={"Cache-Control":"no-store"};
  if(!isConfigured||!process.env.SUPABASE_SERVICE_ROLE_KEY){
    return NextResponse.json({status:"setup_required"},{status:503,headers});
  }
  try{
    const {error}=await adminDb().from("world_ticks").select("id").limit(1);
    if(error)throw new Error("Database query failed");
    return NextResponse.json({status:"ready"},{headers});
  }catch{return NextResponse.json({status:"database_unavailable"},{status:503,headers})}
}
