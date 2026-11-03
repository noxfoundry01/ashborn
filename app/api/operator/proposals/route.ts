import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
import { isOperator } from "@/lib/controls";
const schema=z.object({proposed_usdc:z.number().int().positive().max(1_000_000_000),operator_note:z.string().trim().min(10).max(500)});
export async function POST(request:Request){const user=await requestUser(request);if(!user||!isOperator(user.id))return NextResponse.json({error:"Operator access required"},{status:403});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid draft"},{status:400});const db=adminDb();const {data,error}=await db.from("buyback_proposals").insert({...parsed.data,status:"draft"}).select("id,status").single();if(error)return NextResponse.json({error:"Could not save draft"},{status:503});await db.from("audit_logs").insert({actor_id:user.id,action:"buyback_draft",target:data.id,detail:parsed.data});return NextResponse.json({proposal:data},{status:201})}
