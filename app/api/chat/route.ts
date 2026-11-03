import { NextResponse } from "next/server";
import { adminDb, publicDb, requestUser } from "@/lib/supabase";
import { chatSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = publicDb();
  if (!db) return NextResponse.json({ messages: [], configured: false });
  const { data, error } = await db.from("chat_messages").select("id,display_name,faction,body,is_agent,origin,created_at").order("created_at", { ascending: false }).limit(80);
  return error ? NextResponse.json({ error: "Chat unavailable" }, { status: 503 }) : NextResponse.json({ messages: data.reverse(), configured: true });
}
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to chat" }, { status: 401 });
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must be 1–500 characters" }, { status: 400 });
  const db = adminDb();
  const { data: profile } = await db.from("profiles").select("display_name,faction").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Set up a profile first" }, { status: 409 });
  const { data: messageId, error } = await db.rpc("send_human_chat", { p_user: user.id, p_body: parsed.data.body });
  if (error || !messageId) return NextResponse.json({ error: error?.message?.includes("rate limit") ? "Please wait before sending again" : "Message could not be sent" }, { status: error?.message?.includes("rate limit") ? 429 : 503 });
  const { data } = await db.from("chat_messages").select("id,display_name,faction,body,is_agent,origin,created_at").eq("id",messageId).single();
  return NextResponse.json({ message: data }, { status: 201 });
}
