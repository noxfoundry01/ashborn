import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";
import { isPaused } from "@/lib/controls";
import { workerAuthorized } from "@/lib/worker-auth";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
async function run(request: Request, secret: string | undefined) {
  if (!workerAuthorized(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (process.env.WORLD_PAUSED === "true" || await isPaused("world_paused")) return NextResponse.json({ paused: true });
  const slot = Math.floor(Date.now() / 300_000);
  const { data, error } = await adminDb().rpc("run_world_tick", { p_slot: slot });
  return error ? NextResponse.json({ error: "Tick failed" }, { status: 503 }) : NextResponse.json({ slot, events: data, replay: data === 0 });
}
export async function POST(request: Request) { return run(request, process.env.WORLD_TICK_SECRET); }
export async function GET(request: Request) { return run(request, process.env.CRON_SECRET); }
