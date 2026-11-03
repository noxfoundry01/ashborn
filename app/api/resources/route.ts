import { NextResponse } from "next/server";
import { adminDb, requestUser } from "@/lib/supabase";
import { isPaused } from "@/lib/controls";
import { RESOURCE_CATALOG, resourceOrderSchema } from "@/lib/resources";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const user=await requestUser(request);
  if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const db=adminDb();
  const {data:profile,error:profileError}=await db.from("profiles").select("faction").eq("id",user.id).maybeSingle();
  if(profileError)return NextResponse.json({error:"Inventory unavailable"},{status:503});
  if(!profile)return NextResponse.json({error:"Choose a faction first"},{status:409});
  const [{data:balance,error:balanceError},{data:inventory,error:inventoryError}]=await Promise.all([
    db.from("game_balances").select("credits").eq("user_id",user.id).eq("faction",profile.faction).maybeSingle(),
    db.from("resource_balances").select("resource_key,quantity").eq("user_id",user.id).eq("faction",profile.faction),
  ]);
  if(balanceError||inventoryError)return NextResponse.json({error:"Inventory unavailable"},{status:503});
  return NextResponse.json({faction:profile.faction,credits:String(balance?.credits??0),inventory:inventory??[],catalog:RESOURCE_CATALOG},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await requestUser(request);
  if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const parsed=resourceOrderSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid resource order"},{status:400});
  if(await isPaused("finance_paused"))return NextResponse.json({error:"Resource purchases are paused"},{status:503});
  const {data,error}=await adminDb().rpc("purchase_game_resource",{p_user:user.id,p_request:parsed.data.request_id,p_resource:parsed.data.resource_key,p_quantity:parsed.data.quantity});
  if(error){
    const reason=error.message.includes("Insufficient game credits")?"Insufficient game credits":error.message.includes("Request key already used")?"Request key already used":"Resource purchase unavailable";
    return NextResponse.json({error:reason},{status:reason==="Resource purchase unavailable"?503:409});
  }
  return NextResponse.json(data,{status:201,headers:{"Cache-Control":"no-store"}});
}
