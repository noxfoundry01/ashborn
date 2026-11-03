"use client";
import { useCallback, useEffect, useState } from "react";
import { browserDb, isConfigured } from "@/lib/supabase";
import type { WorldAgent, WorldEvent } from "@/lib/world";
export function useWorld() {
  const [agents, setAgents] = useState<WorldAgent[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unconfigured" | "error">("loading");
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/world", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAgents(data.agents); setEvents(data.events); setState(data.configured ? "ready" : "unconfigured"); }
    catch { setState("error"); }
  }, []);
  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
    if (!isConfigured) return;
    const db = browserDb();
    const channel = db.channel("ashborn-world").on("postgres_changes", { event: "*", schema: "public", table: "agents" }, refresh).on("postgres_changes", { event: "INSERT", schema: "public", table: "world_events" }, refresh).subscribe();
    const timer = setInterval(refresh, 30_000);
    return () => { clearInterval(timer); void db.removeChannel(channel); };
  }, [refresh]);
  return { agents, events, state, refresh };
}
