import { NextResponse } from "next/server";
import { adminDb, requestUser } from "@/lib/supabase";
import { profileSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await adminDb().from("profiles").select("id,display_name,faction,created_at").eq("id", user.id).maybeSingle();
  return error ? NextResponse.json({ error: "Profile unavailable" }, { status: 503 }) : NextResponse.json({ profile: data, email: user.email });
}
export async function PUT(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name and faction" }, { status: 400 });
  const db = adminDb();
  const { data: existing, error: lookupError } = await db.from("profiles").select("faction").eq("id", user.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Profile unavailable" }, { status: 503 });
  if (existing && existing.faction !== parsed.data.faction) return NextResponse.json({ error: "Faction is permanent after profile creation" }, { status: 409 });
  const mutation = existing
    ? db.from("profiles").update({ display_name: parsed.data.display_name, updated_at: new Date().toISOString() }).eq("id", user.id)
    : db.from("profiles").insert({ id: user.id, ...parsed.data });
  const { data, error } = await mutation.select("id,display_name,faction,created_at").single();
  return error ? NextResponse.json({ error: "Could not save profile" }, { status: 503 }) : NextResponse.json({ profile: data });
}
