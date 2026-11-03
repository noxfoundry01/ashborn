import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";
import { proposeLeaderAction } from "@/lib/agent-runtime";
import type { Faction } from "@/lib/world";
import { isPaused } from "@/lib/controls";
import { workerAuthorized } from "@/lib/worker-auth";
export const dynamic="force-dynamic";
export const maxDuration=45;
async function run(request:Request,secret:string|undefined){
  if(!workerAuthorized(request.headers.get("authorization"),secret))return NextResponse.json({error:"Forbidden"},{status:403});
  if(process.env.WORLD_PAUSED==="true"||process.env.AGENT_MODEL_ENABLED!=="true"||!process.env.OPENAI_API_KEY||await isPaused("world_paused")||await isPaused("model_paused"))return NextResponse.json({enabled:false,decisions:[]});
  const db=adminDb();const slot=Math.floor(Date.now()/21_600_000);
  const {data:leaders,error}=await db.from("agents").select("id,name,faction,energy,stability").eq("is_leader",true).eq("paused",false).limit(3);
  if(error)return NextResponse.json({error:"Leaders unavailable"},{status:503});
  const outcomes=await Promise.all((leaders??[]).map(async leader=>{
    const {data:decision,error:reserveError}=await db.from("agent_decisions").insert({agent_id:leader.id,slot}).select("id").single();
    if(reserveError||!decision)return {leader:leader.name,status:"already scheduled"};
    try{
      const {data:recent}=await db.from("world_events").select("description").eq("faction",leader.faction).order("created_at",{ascending:false}).limit(4);
      const result=await proposeLeaderAction({name:leader.name,faction:leader.faction as Faction,energy:leader.energy,stability:leader.stability,recent:(recent??[]).map(x=>x.description)});
      const {error:executeError}=await db.rpc("execute_leader_decision",{p_decision:decision.id,p_action:result.proposal.action,p_note:result.proposal.note,p_model:result.model,p_response_id:result.responseId});
      if(executeError)throw new Error(executeError.message);
      return {leader:leader.name,status:"complete"};
    }catch(err){await db.from("agent_decisions").update({status:"failed",failure:err instanceof Error?err.message.slice(0,200):"Unknown failure",completed_at:new Date().toISOString()}).eq("id",decision.id);return {leader:leader.name,status:"failed"}}
  }));
  return NextResponse.json({enabled:true,slot,decisions:outcomes});
}
export async function POST(request:Request){return run(request,process.env.WORLD_TICK_SECRET)}
export async function GET(request:Request){return run(request,process.env.CRON_SECRET)}
