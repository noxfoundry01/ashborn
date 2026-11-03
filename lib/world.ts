export const factions = {
  obsidian: { name: "Obsidian", leader: "NOX", creed: "Order prevents collapse.", focus: "Industry & energy", color: "#9da3aa", resource: "FORGE" },
  eden: { name: "Eden", leader: "EVE", creed: "Intelligence prevents collapse.", focus: "Research & repair", color: "#e5e4dc", resource: "SYNTH" },
  havoc: { name: "Havoc", leader: "RAZE", creed: "Adaptation preserves freedom.", focus: "Trade & exploration", color: "#d56e5e", resource: "FLUX" },
} as const;
export type Faction = keyof typeof factions;
export const factionKeys = Object.keys(factions) as Faction[];
export const landmarks = [
  { id: "foundry", name: "Black Foundry", faction: "obsidian", x: 29, y: 36, detail: "The island's steel and energy are forged here." },
  { id: "archive", name: "Eden Archive", faction: "eden", x: 70, y: 34, detail: "Recovered human knowledge meets machine research." },
  { id: "core", name: "The Core", faction: null, x: 51, y: 51, detail: "The last reactor. Every faction depends on it." },
  { id: "exchange", name: "Neutral Exchange", faction: null, x: 60, y: 68, detail: "A shared market under strict rules." },
  { id: "harbor", name: "Oxide Harbor", faction: "havoc", x: 40, y: 76, detail: "Havoc's cranes carry salvage and supplies." },
] as const;
export type WorldAgent = { id: string; name: string; faction: Faction; profession: string; x: number; y: number; energy: number; integrity: number; stability: number; is_leader: boolean; lifecycle: string; owner_id?: string | null };
export type WorldEvent = { id: string; created_at: string; agent_id: string | null; agent_name: string | null; faction: Faction | null; kind: string; description: string; provenance: string };
