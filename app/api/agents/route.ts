import { NextResponse } from "next/server";
import { adminDb, requestUser } from "@/lib/supabase";
import { soulSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const db = adminDb();
  const { data, error } = await db.from("agents").select("id,name,faction,profession,chassis,energy,integrity,stability,lifecycle,paused,public_chat,created_at,agent_souls(*)").eq("owner_id", user.id).order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: "Agents unavailable" }, { status: 503 }) : NextResponse.json({ agents: data });
}
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = soulSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check your agent details" }, { status: 400 });
  const db = adminDb();
  const { data: agentId, error } = await db.rpc("create_user_agent", {
    p_user: user.id, p_name: parsed.data.name, p_chassis: parsed.data.chassis,
    p_profession: parsed.data.profession, p_value: parsed.data.value,
    p_motivation: parsed.data.motivation, p_curiosity: parsed.data.curiosity,
    p_ambition: parsed.data.ambition, p_sociability: parsed.data.sociability,
    p_caution: parsed.data.caution, p_public_chat: parsed.data.public_chat,
  });
  if (error || !agentId) return NextResponse.json({ error: "Create a profile first, or check whether you already have an agent" }, { status: 409 });
  const { data: agent } = await db.from("agents").select("id,name,faction").eq("id", agentId).single();
  return NextResponse.json({ agent: agent ?? { id: agentId, name: parsed.data.name } }, { status: 201 });
}
