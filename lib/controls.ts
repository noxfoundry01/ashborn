import { adminDb } from "@/lib/supabase";
export type ControlKey="world_paused"|"model_paused"|"finance_paused"|"x402_paused";
export async function isPaused(key:ControlKey){const {data,error}=await adminDb().from("system_controls").select("world_paused,model_paused,finance_paused,x402_paused").eq("id",1).single();if(error||!data)throw new Error("Operator controls unavailable");return Boolean(data[key]);}
export function isOperator(userId:string){return Boolean(process.env.OPERATOR_USER_ID&&userId===process.env.OPERATOR_USER_ID)}
