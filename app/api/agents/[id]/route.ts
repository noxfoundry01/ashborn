import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const user = await requestUser(request); if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params; if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
  const db=adminDb();const {data:agent,error}=await db.from("agents").select("*,agent_souls(*)").eq("id",id).eq("owner_id",user.id).maybeSingle();
  if(error)return NextResponse.json({error:"Agent unavailable"},{status:503});
  if(!agent)return NextResponse.json({error:"Agent not found"},{status:404});
  const [memoryResult,goalResult,jobResult,skillResult,versionResult]=await Promise.all([
    db.from("agent_memories").select("id,summary,created_at").eq("agent_id",id).order("created_at",{ascending:false}).limit(20),
    db.from("agent_goals").select("id,goal,status").eq("agent_id",id).eq("status","active").limit(5),
    db.from("agent_jobs").select("id,profession,outcome,created_at").eq("agent_id",id).order("created_at",{ascending:false}).limit(10),
    db.from("agent_skills").select("skill,experience").eq("agent_id",id).order("experience",{ascending:false}).limit(10),
    db.from("agent_soul_versions").select("version,soul,created_at").eq("agent_id",id).order("version",{ascending:false}).limit(10),
  ]);
  if([memoryResult,goalResult,jobResult,skillResult,versionResult].some(result=>result.error))return NextResponse.json({error:"Agent journal unavailable"},{status:503});
  return NextResponse.json({agent,memories:memoryResult.data,goals:goalResult.data,jobs:jobResult.data,skills:skillResult.data,soulVersions:versionResult.data});
}
export async function PATCH(request:Request,{params}:Context){const user=await requestUser(request);if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const {id}=await params;if(!z.uuid().safeParse(id).success)return NextResponse.json({error:"Invalid agent"},{status:400});const parsed=z.object({paused:z.boolean()}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid change"},{status:400});const {data,error}=await adminDb().from("agents").update({paused:parsed.data.paused,updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id).select("id,paused").maybeSingle();return error?NextResponse.json({error:"Could not update agent"},{status:503}):data?NextResponse.json({agent:data}):NextResponse.json({error:"Agent not found"},{status:404});}
