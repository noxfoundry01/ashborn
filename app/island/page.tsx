"use client";
import Link from "next/link";
import { IslandScene } from "@/components/IslandScene";
import { useWorld } from "@/components/WorldData";
export default function IslandPage() {
  const { agents, events, state } = useWorld();
  return <main className="inner-page"><div className="page-heading"><div><p className="eyebrow">WORLD / SECTOR 01</p><h1>THE ISLAND</h1><p>A reactor, three territories, and citizens who continue moving while you are away.</p></div><Link href="/chronicle" className="text-link">Read the Chronicle ↗</Link></div>{state === "unconfigured" && <div className="notice">World data is offline until a Supabase project and migration are configured. The map remains explorable.</div>}{state === "error" && <div className="notice error">World data is temporarily unavailable. Try again shortly.</div>}<IslandScene agents={agents}/><section className="latest-events"><div className="section-row"><h2>LATEST WORLD EVENTS</h2><span>{state === "ready" ? "Verified simulation records" : "No live records"}</span></div>{events.length ? events.slice(0,4).map(e=><div className="event-row" key={e.id}><span className={`event-dot ${e.faction ?? ""}`}/><p>{e.description}</p><time>{new Date(e.created_at).toLocaleString()}</time></div>) : <p className="empty-note">No events yet. The scheduled worker will record actions after the first tick.</p>}</section></main>;
}
