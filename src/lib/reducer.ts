import { buildEventSchema,patchSchema } from "./schema";
import type {Artifacts,BuildEvent,Patch} from "./schema";
import {equivalentBuildEvent} from "./build-stream";
export const emptyArtifacts=():Artifacts=>({brief:null,brand:{core:null,logo:null},finance:null,website:{setup:null,sections:[]},pitch:{slides:[]}});
export function applyPatch(a:Artifacts,input:Patch):Artifacts{
 const p=patchSchema.parse(input);
 const next:Artifacts={...a,brand:{...a.brand},website:{...a.website,sections:[...a.website.sections]},pitch:{slides:[...a.pitch.slides]}};
 if(p.artifact==="brief")next.brief=p.value;
 else if(p.artifact==="brand"&&p.path==="core")next.brand.core=p.value;
 else if(p.artifact==="brand"&&p.path==="logo")next.brand.logo=p.value;
 else if(p.artifact==="finance")next.finance=p.value;
 else if(p.artifact==="website"&&p.path==="setup")next.website.setup=p.value;
 else if(p.artifact==="website"&&p.path==="sections"){
  if(next.website.sections.length>=8)throw new Error("Website section limit reached");
  next.website.sections.push(p.value);
 }else if(p.artifact==="pitch"){
  if(next.pitch.slides.length>=10)throw new Error("Pitch slide limit reached");
  next.pitch.slides.push(p.value);
 }
 return next;
}
/** Poll and stream deliveries can overlap; a sequence may only be applied once. */
export function reduceEvents(events:BuildEvent[],initial:Artifacts=emptyArtifacts()):Artifacts{
 const seen=new Map<number,BuildEvent>();let buildId:string|undefined;let time=0;let state=initial;
 for(const raw of [...events].sort((a,b)=>a.seq-b.seq)){
  const e=buildEventSchema.parse(raw);
  if(buildId&&buildId!==e.build_id)throw new Error("Cannot mix events from different builds");
  buildId=e.build_id;
  const previous=seen.get(e.seq);
  if(previous){if(!equivalentBuildEvent(previous,e))throw new Error("Conflicting event sequence");continue;}
  seen.set(e.seq,e);
  if(e.t_ms<time)throw new Error("Event time moved backwards");
  time=e.t_ms;
  if(e.type==="artifact.patch")state=applyPatch(state,patchSchema.parse(e.payload));
 }
 return state;
}
export function eventStatus(events:BuildEvent[]):Record<string,string>{
 const status:Record<string,string>={};
 for(const e of [...events].sort((a,b)=>a.seq-b.seq)){
  if(e.type==="agent.started")status[e.agent]="working";
  if(e.type==="agent.completed")status[e.agent]="done";
  if(e.type==="agent.failed")status[e.agent]="failed";
  if(e.type==="agent.status"&&typeof e.payload.message==="string")status[e.agent]=e.payload.message;
 }
 return status;
}
