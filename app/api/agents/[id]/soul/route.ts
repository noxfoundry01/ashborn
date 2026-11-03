import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
import { soulUpdateSchema } from "@/lib/validation";

type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Context){
  const user=await requestUser(request);
  if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return NextResponse.json({error:"Invalid agent"},{status:400});
  const parsed=soulUpdateSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid Soul Core"},{status:400});
  const soul=parsed.data;
  const {data:version,error}=await adminDb().rpc("revise_user_soul",{
    p_user:user.id,p_agent:id,p_value:soul.value,p_motivation:soul.motivation,
    p_curiosity:soul.curiosity,p_ambition:soul.ambition,p_sociability:soul.sociability,p_caution:soul.caution,
  });
  if(error){
    const limited=error.message.includes("Soul Core edit limit");
    const missing=error.message.includes("Agent not found");
    return NextResponse.json({error:limited?"Soul Core edit limit reached for today":missing?"Agent not found":"Could not save Soul Core"},{status:limited?429:missing?404:503});
  }
  return NextResponse.json({version});
}
