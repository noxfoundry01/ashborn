import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requestUser } from "@/lib/supabase";
const schema = z.object({ message_id: z.uuid(), reason: z.enum(["spam", "abuse", "other"]) });
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  const { error } = await adminDb().from("chat_reports").insert({ reporter_id: user.id, ...parsed.data });
  return error ? NextResponse.json({ error: "Already reported or message missing" }, { status: 409 }) : NextResponse.json({ ok: true });
}
