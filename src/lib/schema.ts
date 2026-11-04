import { z } from "zod";

export const paletteSchema = z.object({
  bg: z.string().regex(/^#[a-f0-9]{6}$/i),
  surface: z.string().regex(/^#[a-f0-9]{6}$/i),
  ink: z.string().regex(/^#[a-f0-9]{6}$/i),
  primary: z.string().regex(/^#[a-f0-9]{6}$/i),
  accent: z.string().regex(/^#[a-f0-9]{6}$/i),
});
export const fontPairs = ["editorial", "modern", "warm", "technical", "playful", "classic"] as const;
export const coreSchema = z.object({
  name: z.string().min(2).max(42),
  tagline: z.string().min(5).max(145),
  description: z.string().min(10).max(300),
  industry: z.string().min(3).max(60),
  font: z.enum(fontPairs),
  voice: z.string().max(80),
  palette: paletteSchema
});
export const logoShapeSchema = z.discriminatedUnion("kind", [
  z.object({kind:z.literal("circle"), cx:z.number().min(0).max(100),cy:z.number().min(0).max(100),r:z.number().min(0).max(100), fill:z.enum(["primary","accent","ink","surface"])}),
  z.object({kind:z.literal("rect"),x:z.number().min(0).max(100),y:z.number().min(0).max(100),width:z.number().min(0).max(100),height:z.number().min(0).max(100),rx:z.number().min(0).max(50),fill:z.enum(["primary","accent","ink","surface"])}),
  z.object({kind:z.literal("path"),d:z.string().max(500).regex(/^[0-9.,\s\-+a-zA-Z]+$/),fill:z.enum(["primary","accent","ink","surface"])}),
  z.object({kind:z.literal("line"),x1:z.number().min(0).max(100),y1:z.number().min(0).max(100),x2:z.number().min(0).max(100),y2:z.number().min(0).max(100),width:z.number().min(1).max(20),fill:z.enum(["primary","accent","ink","surface"])})
]);
export const logoSchema = z.object({ shapes:z.array(logoShapeSchema).min(1).max(12) });
export const financeSchema = z.object({
  archetype:z.enum(["subscription","transactional","capacity","marketplace"]),
  monthlyPrice:z.number().min(1).max(100000),
  initialCustomers:z.number().int().min(1).max(100000),
  monthlyGrowthPct:z.number().min(-10).max(50),
  churnPct:z.number().min(0).max(20),
  variableCostPct:z.number().min(0).max(90),
  monthlyFixedCosts:z.number().min(0).max(1000000),
  startupCost:z.number().min(0).max(10000000),
  currency:z.literal("USD"),
  rationale:z.string().min(10).max(300)
});
export const sectionSchema = z.object({
  type:z.enum(["hero","benefits","features","steps","testimonial","pricing","stats","faq","cta"]),
  variant:z.enum(["centered","split","cards","editorial","minimal","dark","bold"]),
  kicker:z.string().max(75).default(""),
  headline:z.string().min(3).max(155),
  body:z.string().max(400).default(""),
  items:z.array(z.object({title:z.string().max(90),body:z.string().max(200)})).max(6).default([]),
  cta:z.string().max(45).default("Get started")
});
export const websiteSetupSchema = z.object({
  archetype:z.enum(["editorial","luxury","playful","tech","organic","bold"]),
  domainSuggestion:z.string().max(70),
  navigation:z.array(z.string().max(30)).max(5).default(["Overview","Benefits","Pricing"]),
  radius:z.enum(["sharp","medium","round"]),
  density:z.enum(["airy","balanced","dense"])
});
export const slideSchema = z.object({
  layout:z.enum(["statement","bullets","metrics","problem","solution","roadmap","closing"]),
  eyebrow:z.string().max(60).default(""),
  title:z.string().min(3).max(110),
  body:z.string().max(260).default(""),
  bullets:z.array(z.string().max(130)).max(5).default([]),
  metricKeys:z.array(z.enum(["monthlyPrice","year1Revenue","year3Revenue","year1Profit","breakEvenMonth"])).max(3).default([])
});
export const briefSchema=z.object({
  idea:z.string().max(200),
  audience:z.string().max(130),
  offering:z.string().max(130),
  category:z.string().max(70),
  positioning:z.string().max(220),
  archetype:z.enum(["editorial","luxury","playful","tech","organic","bold"]),
  allowed:z.boolean(),
  reason:z.string().max(200)
});
export const patchSchema=z.object({
  artifact:z.enum(["brief","brand","finance","website","pitch"]),
  path:z.enum(["data","core","logo","assumptions","setup","sections","slides"]),
  op:z.enum(["set","append"]),
  value:z.unknown()
});
export type Core=z.infer<typeof coreSchema>;
export type Logo=z.infer<typeof logoSchema>;
export type Finance=z.infer<typeof financeSchema>;
export type Section=z.infer<typeof sectionSchema>;
export type WebsiteSetup=z.infer<typeof websiteSetupSchema>;
export type Slide=z.infer<typeof slideSchema>;
export type Brief=z.infer<typeof briefSchema>;
export type Patch=z.infer<typeof patchSchema>;
export type Agent="Brief"|"Brand"|"Finance"|"Website"|"Pitch"|"System";
export type EventType="build.started"|"agent.started"|"agent.status"|"artifact.patch"|"handoff"|"agent.retry"|"agent.failed"|"agent.completed"|"build.completed";
export interface BuildEvent {
  build_id:string;seq:number;t_ms:number;agent:Agent;type:EventType;
  payload:Record<string,unknown>;
}
export interface Artifacts {
  brief:Brief|null;
  brand:{core:Core|null;logo:Logo|null};
  finance:Finance|null;
  website:{setup:WebsiteSetup|null;sections:Section[]};
  pitch:{slides:Slide[]};
}
export interface BuildRecord {
  id:string;slug:string;prompt:string;status:"running"|"completed"|"partial"|"failed";
  started_at:string;duration_ms:number;artifacts:Artifacts;featured:boolean;
  schema_version:number;
}
