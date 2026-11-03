import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";
import { factionSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const db = publicDb();
  if (!db) return NextResponse.json({ events: [], configured: false });
  const faction = new URL(request.url).searchParams.get("faction");
  let query = db.from("world_events").select("id,created_at,agent_id,agent_name,faction,kind,description,provenance").order("created_at", { ascending: false }).limit(100);
  if (faction && faction !== "all") {
    const parsed = factionSchema.safeParse(faction);
    if (!parsed.success) return NextResponse.json({ error: "Invalid faction" }, { status: 400 });
    query = query.eq("faction", parsed.data);
  }
  const { data, error } = await query;
  return error ? NextResponse.json({ error: "Chronicle unavailable" }, { status: 503 }) : NextResponse.json({ events: data, configured: true });
}
