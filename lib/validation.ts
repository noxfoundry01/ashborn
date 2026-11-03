import { z } from "zod";
export const factionSchema = z.enum(["obsidian", "eden", "havoc"]);
export const profileSchema = z.object({ display_name: z.string().trim().min(2).max(32).regex(/^[\p{L}\p{N} _-]+$/u), faction: factionSchema });
export const soulSchema = z.object({ name: z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N} _-]+$/u), chassis: z.enum(["sentinel", "weaver", "ranger"]), profession: z.enum(["engineer", "researcher", "scout", "courier", "medic"]), value: z.enum(["loyalty", "freedom", "knowledge", "survival"]), motivation: z.string().trim().min(5).max(180), curiosity: z.number().int().min(0).max(100), ambition: z.number().int().min(0).max(100), sociability: z.number().int().min(0).max(100), caution: z.number().int().min(0).max(100), public_chat: z.boolean().default(false) });
export const soulUpdateSchema=soulSchema.pick({value:true,motivation:true,curiosity:true,ambition:true,sociability:true,caution:true}).strict();
export const chatSchema = z.object({ body: z.string().trim().min(1).max(500) });
