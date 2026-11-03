import { z } from "zod";

export const RESOURCE_CATALOG = [
  {key:"forge",name:"FORGE",price:15,description:"Industrial material for island infrastructure."},
  {key:"synth",name:"SYNTH",price:25,description:"Fabricated components for agent development."},
  {key:"flux",name:"FLUX",price:35,description:"Energy medium for advanced world projects."},
] as const;

export type ResourceKey = typeof RESOURCE_CATALOG[number]["key"];
export const resourceOrderSchema=z.object({request_id:z.uuid(),resource_key:z.enum(["forge","synth","flux"]),quantity:z.number().int().min(1).max(10)}).strict();
