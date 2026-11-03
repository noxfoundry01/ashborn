import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = publicDb();
  if (!db) return NextResponse.json({ agents: [], events: [], configured: false });
  const [agents, events] = await Promise.all([
    db.from("agents").select("id,name,faction,profession,x,y,energy,integrity,stability,is_leader,lifecycle,owner_id").order("is_leader", { ascending: false }).limit(100),
    db.from("world_events").select("id,created_at,agent_id,agent_name,faction,kind,description,provenance").order("created_at", { ascending: false }).limit(12),
  ]);
  if (agents.error || events.error) return NextResponse.json({ error: "World data is unavailable" }, { status: 503 });
  return NextResponse.json({ agents: agents.data, events: events.data, configured: true });
}
