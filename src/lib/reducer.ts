import { briefSchema,coreSchema,financeSchema,logoSchema,patchSchema,sectionSchema,slideSchema,websiteSetupSchema } from "./schema";
import type {Artifacts,BuildEvent,Patch} from "./schema";
export const emptyArtifacts=():Artifacts=>({brief:null,brand:{core:null,logo:null},finance:null,website:{setup:null,sections:[]},pitch:{slides:[]}});
export function applyPatch(a:Artifacts,p:Patch):Artifacts{
 const next:Artifacts={...a,brand:{...a.brand},website:{...a.website,sections:[...a.website.sections]},pitch:{slides:[...a.pitch.slides]}};
 try{
  if(p.artifact==="brief"&&p.path==="data"&&p.op==="set")next.brief=briefSchema.parse(p.value);
  else if(p.artifact==="brand"&&p.path==="core"&&p.op==="set")next.brand.core=coreSchema.parse(p.value);
  else if(p.artifact==="brand"&&p.path==="logo"&&p.op==="set")next.brand.logo=logoSchema.parse(p.value);
  else if(p.artifact==="finance"&&p.path==="assumptions"&&p.op==="set")next.finance=financeSchema.parse(p.value);
  else if(p.artifact==="website"&&p.path==="setup"&&p.op==="set")next.website.setup=websiteSetupSchema.parse(p.value);
  else if(p.artifact==="website"&&p.path==="sections"&&p.op==="append")next.website.sections.push(sectionSchema.parse(p.value));
  else if(p.artifact==="pitch"&&p.path==="slides"&&p.op==="append")next.pitch.slides.push(slideSchema.parse(p.value));
  else throw new Error("Unsupported patch: "+p.artifact+"/"+p.path+"/"+p.op);
 }catch(e){throw new Error("Patch validation: "+(e instanceof Error?e.message:"unknown"));}
 return next;
}
export function reduceEvents(events:BuildEvent[],initial:Artifacts=emptyArtifacts()):Artifacts{
 return [...events].sort((a,b)=>a.seq-b.seq).reduce((state,e)=>{
   if(e.type!=="artifact.patch")return state;
   return applyPatch(state,patchSchema.parse(e.payload));
 },initial);
}
export function eventStatus(events:BuildEvent[]):Record<string,string>{
 const status:Record<string,string>={};
 for(const e of events){
  if(e.type==="agent.started")status[e.agent]="working";
  if(e.type==="agent.completed")status[e.agent]="done";
  if(e.type==="agent.failed")status[e.agent]="failed";
  if(e.type==="agent.status"&&typeof e.payload.message==="string")status[e.agent]=e.payload.message;
 }
 return status;
}
