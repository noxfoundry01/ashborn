import { z } from "zod";
export const leaderActions = { obsidian: ["maintain", "fortify"], eden: ["research", "repair"], havoc: ["scout", "dispatch"] } as const;
const proposalSchema = z.object({ action: z.enum(["maintain", "fortify", "research", "repair", "scout", "dispatch"]), note: z.string().trim().max(180) });
export type LeaderProposal = z.infer<typeof proposalSchema>;
export function validateLeaderProposal(faction: keyof typeof leaderActions, value: unknown): LeaderProposal {
  const parsed = proposalSchema.parse(value);
  if (!(leaderActions[faction] as readonly string[]).includes(parsed.action)) throw new Error("Action is outside this leader's permissions");
  return parsed;
}
type ModelResponse = { id?: string; output?: { type?: string; name?: string; arguments?: string }[] };
export async function proposeLeaderAction(input: { name: string; faction: keyof typeof leaderActions; energy: number; stability: number; recent: string[] }) {
  const key=process.env.OPENAI_API_KEY;
  if (!key || process.env.AGENT_MODEL_ENABLED !== "true") throw new Error("Model runtime disabled");
  const model=process.env.ASHBORN_AGENT_MODEL || "gpt-6-luna";
  const allowed=leaderActions[input.faction];
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:AbortSignal.timeout(20_000),headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,store:false,max_output_tokens:180,instructions:"You are a leader in a fictional island simulation. Choose exactly one safe world action from the allowed list. No payments, chat, URLs, shell commands, or asset transfers. Return a function call. The note must describe your reason in one short sentence, without invented outcomes.",input:JSON.stringify({leader:input.name,faction:input.faction,energy:input.energy,stability:input.stability,recent_events:input.recent.slice(0,4),allowed_actions:allowed}),tools:[{type:"function",name:"propose_world_action",description:"Propose one safe in-game leadership action for validation and execution by the server.",strict:true,parameters:{type:"object",properties:{action:{type:"string",enum:allowed},note:{type:"string",maxLength:180}},required:["action","note"],additionalProperties:false}}],tool_choice:{type:"function",name:"propose_world_action"}})});
  if (!response.ok) throw new Error(`Model request failed (${response.status})`);
  const payload=await response.json() as ModelResponse;
  const call=payload.output?.find(item=>item.type==="function_call"&&item.name==="propose_world_action");
  if (!call?.arguments || !payload.id) throw new Error("Model did not return a valid tool call");
  return { proposal: validateLeaderProposal(input.faction,JSON.parse(call.arguments)), model, responseId: payload.id };
}
