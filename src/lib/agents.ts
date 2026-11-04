import Anthropic from "@anthropic-ai/sdk";
import {z} from "zod";
import {briefSchema,coreSchema,financeSchema,logoSchema,sectionSchema,slideSchema,websiteSetupSchema} from "./schema";
import type {Artifacts,BuildEvent,BuildRecord,Patch,Agent,Brief,Core,Finance} from "./schema";
import {applyPatch,emptyArtifacts} from "./reducer";
import {createBuild,finishBuild,saveEventBatch} from "./storage";

const fast=process.env.AI_FAST_MODEL||"claude-haiku-4-5-20251001";
const main=process.env.AI_MAIN_MODEL||"claude-sonnet-4-5-20250929";
const instruction="You are a creative startup studio. Produce differentiated, elegant, plausible concept artifacts. No real-company impersonation, no exaggerated factual claims, no invented citations, no markdown fences. This is a fictional demonstration, not a verified business. All financial figures are illustrative. Output strictly the requested machine-readable JSON. Avoid generic phrases like revolutionize, unleash, and game-changer.";
type Emit=(agent:Agent,type:BuildEvent["type"],payload:Record<string,unknown>)=>void;
type Put=(agent:Agent,patch:Patch)=>void;
function client():Anthropic{
 if(!process.env.ANTHROPIC_API_KEY)throw new Error("ANTHROPIC_API_KEY not configured");
 return new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY,maxRetries:0,timeout:35000});
}
function extractJson(s:string):unknown{
 const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a===-1||b<=a)throw new Error("Model did not return JSON");
 return JSON.parse(s.slice(a,b+1));
}
async function single(prompt:string,model=fast):Promise<unknown>{
 const r=await client().messages.create({model,max_tokens:1600,messages:[{role:"user",content:instruction+"\n\n"+prompt}]});
 const text=r.content.filter(b=>b.type==="text").map(b=>b.text).join("");
 return extractJson(text);
}
async function streamLines(prompt:string,model:string,accept:(o:unknown)=>void){
 const stream=client().messages.stream({model,max_tokens:4800,messages:[{role:"user",content:instruction+"\n\n"+prompt}]});
 let buffer="",total=0,accepted=0;
 for await(const event of stream){
  if(event.type!=="content_block_delta"||event.delta.type!=="text_delta")continue;
  buffer+=event.delta.text;total+=event.delta.text.length;
  if(total>55000)throw new Error("Model output exceeded safety limit");
  let end;
  while((end=buffer.indexOf("\n"))!==-1){
   const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
   if(line.startsWith("{")){accept(JSON.parse(line));accepted++;}
  }
 }
 const rest=buffer.trim();if(rest.startsWith("{")){accept(JSON.parse(rest));accepted++;}
 if(accepted===0)throw new Error("No structured patches emitted");
}
const lineSchema=z.object({path:z.string(),value:z.unknown()});
const brandPrompt=(b:Brief)=>"Build a brand for this fictional business: "+JSON.stringify(b)+
 "\nOutput EXACTLY 2 JSONL lines (each complete JSON object, no array and no markdown). Line 1: {\"path\":\"core\",\"value\":{name,tagline,description,industry,font,voice,palette}}. Font enum: editorial,modern,warm,technical,playful,classic. Palette keys bg,surface,ink,primary,accent use #RRGGBB and strong contrast. Line 2: {\"path\":\"logo\",\"value\":{\"shapes\":[...]}}. Logo is geometric shapes on 100x100 coordinate plane, max 8 shapes. Shapes can be {kind:'circle',cx,cy,r,fill}, {kind:'rect',x,y,width,height,rx,fill}, {kind:'path',d,fill}, {kind:'line',x1,y1,x2,y2,width,fill}. Use valid JSON double-quoted strings and fill enum primary,accent,ink,surface. Make identity distinctive, clever, premium. First line MUST be the brand core, to unlock downstream agents.";
const financePrompt=(b:Brief)=>"Create reasonable but explicitly hypothetical numeric assumptions for a startup in "+JSON.stringify(b)+
 "\nReturn ONE JSON OBJECT only with keys archetype (subscription|transactional|capacity|marketplace), monthlyPrice (price per customer order/booking or monthly subscription), initialCustomers, monthlyGrowthPct, churnPct, variableCostPct, monthlyFixedCosts, startupCost, currency:'USD', rationale. Numbers not strings. Assume an illustrative startup, no fabricated market facts. Be conservative and specific to the business.";
const sitePrompt=(b:Brief,core:Core,finance:Finance)=>"Produce an unusually distinctive mobile-first landing page structure for "+JSON.stringify({brief:b,brand:core,price:finance.monthlyPrice,archetype:finance.archetype})+
 "\nOutput one complete JSONL object per line, NO markdown. First line {\"path\":\"setup\",\"value\":{archetype,domainSuggestion,navigation,radius,density}} with archetype editorial|luxury|playful|tech|organic|bold, radius sharp|medium|round, density airy|balanced|dense. Then 6-7 lines {\"path\":\"sections\",\"value\":{type,variant,kicker,headline,body,items,cta}}. type hero|benefits|features|steps|testimonial|pricing|stats|faq|cta; variant centered|split|cards|editorial|minimal|dark|bold. items array of {title,body}. Begin with hero, include benefits, steps, pricing, FAQ or stats, end with CTA. ALL props required. Specific copy, real differentiation, beautiful editorial hierarchy. No fake quotes, statistics, partnerships, awards, or testimonials. Pricing number is rendered by deterministic code, do not invent price.";
const pitchPrompt=(b:Brief,core:Core,finance:Finance)=>"Produce a striking 7-slide investor concept deck for "+JSON.stringify({brief:b,brand:core,finance})+
 "\nOutput EXACTLY one JSON object per line {\"path\":\"slides\",\"value\":{layout,eyebrow,title,body,bullets,metricKeys}}. layout enum statement|bullets|metrics|problem|solution|roadmap|closing. metricKeys enum monthlyPrice|year1Revenue|year3Revenue|year1Profit|breakEvenMonth. Start with statement, end with closing, include problem, solution, metrics, roadmap. Each slide needs all six keys. Numbers MUST be references in metricKeys; no hardcoded market sizes. The deck must match the brand strategy and be specific not generic.";

export async function generateCompany(opts:{id:string;slug:string;prompt:string;ipHash:string;push:(event:BuildEvent)=>void}):Promise<BuildRecord>{
 const started=Date.now();let seq=0;let artifacts:Artifacts=emptyArtifacts();
 const record:BuildRecord={id:opts.id,slug:opts.slug,prompt:opts.prompt,status:"running",started_at:new Date(started).toISOString(),duration_ms:0,artifacts,featured:false,schema_version:1};
 await createBuild(record,opts.ipHash);
 const pending:BuildEvent[]=[];
 const emit:Emit=(agent,type,payload)=>{
  const e:BuildEvent={build_id:opts.id,seq:++seq,t_ms:Date.now()-started,agent,type,payload};
  pending.push(e);opts.push(e);
 };
 const flush=async()=>{
  if(pending.length){const batch=pending.splice(0);await saveEventBatch(opts.id,batch);}
 };
 const put:Put=(agent,patch)=>{
  artifacts=applyPatch(artifacts,patch);
  emit(agent,"artifact.patch",patch as unknown as Record<string,unknown>);
 };
 const stage=async(agent:Agent,fn:()=>Promise<void>)=>{
  emit(agent,"agent.started",{message:agent+" started"});
  try{await fn();emit(agent,"agent.completed",{message:agent+" finished"});}
  catch(e){
   const message=e instanceof Error?e.message:"Generation failed";
   emit(agent,"agent.failed",{message:message.slice(0,180)});throw e;
  }
 };
 emit("System","build.started",{prompt:opts.prompt});
 try{
  let brief:Brief|null=null;
  await stage("Brief",async()=>{
   const raw=await single("Evaluate and structure this one-sentence fictional business idea: "+JSON.stringify(opts.prompt)+
   "\nReturn JSON {idea,audience,offering,category,positioning,archetype,allowed,reason}. archetype: editorial|luxury|playful|tech|organic|bold. allowed false for abuse, illicit activity or real-company impersonation.");
   brief=briefSchema.parse(raw);put("Brief",{artifact:"brief",path:"data",op:"set",value:brief});
   if(!brief.allowed)throw new Error("This idea cannot be generated: "+brief.reason);
  });
  if(!brief)throw new Error("Brief missing");
  const b:Brief=brief;
  // Genuine dependency edges: start downstream immediately when BOTH core and assumptions arrive,
  // not after the logo is finished. Each agent emits validated semantic patches.
  let unlock!:()=>void;let failUnlock!:(reason:unknown)=>void;
  const ready=new Promise<void>((resolve,reject)=>{unlock=resolve;failUnlock=reject;});
  const checkReady=()=>{if(artifacts.brand.core&&artifacts.finance)unlock();};
  const brandTask=stage("Brand",async()=>{
   let gotCore=false;
   await streamLines(brandPrompt(b),main,(obj)=>{
    const line=lineSchema.parse(obj);
    if(line.path==="core"){
      const core=coreSchema.parse(line.value);
      put("Brand",{artifact:"brand",path:"core",op:"set",value:core});gotCore=true;checkReady();
    } else if(line.path==="logo"){
      put("Brand",{artifact:"brand",path:"logo",op:"set",value:logoSchema.parse(line.value)});
    }else throw new Error("Unknown brand line: "+line.path);
   });
   if(!gotCore)throw new Error("Brand core missing");
  }).catch(e=>{failUnlock(e);throw e;});
  const financeTask=stage("Finance",async()=>{
   const raw=await single(financePrompt(b),main);put("Finance",{artifact:"finance",path:"assumptions",op:"set",value:financeSchema.parse(raw)});checkReady();
  }).catch(e=>{failUnlock(e);throw e;});
  // Catch on tasks early to avoid unhandled rejection during dependency wait.
  const running=[brandTask,financeTask];
  await ready;
  emit("System","handoff",{from:["Brand","Finance"],to:["Website","Pitch"],message:"Brand + financial assumptions unlocked downstream agents"});
  const core=artifacts.brand.core!,fin=artifacts.finance!;
  const websiteTask=stage("Website",async()=>{
    let setup=false,sections=0;
    await streamLines(sitePrompt(b,core,fin),main,(obj)=>{
      const line=lineSchema.parse(obj);
      if(line.path==="setup"){put("Website",{artifact:"website",path:"setup",op:"set",value:websiteSetupSchema.parse(line.value)});setup=true;}
      else if(line.path==="sections"){put("Website",{artifact:"website",path:"sections",op:"append",value:sectionSchema.parse(line.value)});sections++;}
      else throw new Error("Invalid website patch");
    });
    if(!setup||sections<4)throw new Error("Incomplete website output");
  });
  const pitchTask=stage("Pitch",async()=>{
    let slides=0;
    await streamLines(pitchPrompt(b,core,fin),main,(obj)=>{
      const line=lineSchema.parse(obj);
      if(line.path!=="slides")throw new Error("Invalid pitch patch");
      put("Pitch",{artifact:"pitch",path:"slides",op:"append",value:slideSchema.parse(line.value)});slides++;
    });
    if(slides<5)throw new Error("Incomplete pitch output");
  });
  const results=await Promise.allSettled([...running,websiteTask,pitchTask]);
  if(results.some(r=>r.status==="rejected"))record.status="partial";else record.status="completed";
 }catch(e){
  // Await eventual completion of already launched tasks before snapshotting.
  record.status="failed";
  emit("System","agent.status",{message:e instanceof Error?e.message:"Build failed"});
 }
 record.duration_ms=Date.now()-started;
 record.artifacts=artifacts;
 emit("System","build.completed",{status:record.status,duration_ms:record.duration_ms});
 await flush();
 await finishBuild(record);
 return record;
}
