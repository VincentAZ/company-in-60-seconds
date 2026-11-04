import {createClient} from "@supabase/supabase-js";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import type {BuildEvent,BuildRecord} from "./schema";
import {examples,exampleById} from "./fixtures";

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
const local=path.join(process.cwd(),".local-data");
const storeFile=(id:string)=>path.join(local,id.replace(/[^a-zA-Z0-9-]/g,"")+".json");
async function localRead(id:string):Promise<{record:BuildRecord;events:BuildEvent[]}|null>{
 try {return JSON.parse(await readFile(storeFile(id),"utf8"));} catch {return null;}
}
async function localWrite(id:string,item:{record:BuildRecord;events:BuildEvent[]}) {
 await mkdir(local,{recursive:true});await writeFile(storeFile(id),JSON.stringify(item),"utf8");
}
export function persistentDbEnabled(){return Boolean(db);}
export async function createBuild(record:BuildRecord,ipHash:string) {
 if(db){
  const {error}=await db.from("builds").insert({...record,brief:record.artifacts.brief,ip_hash:ipHash});
  if(error)throw new Error("Database insert: "+error.message);
 }else await localWrite(record.id,{record,events:[]});
}
export async function saveEventBatch(id:string,events:BuildEvent[]) {
 if(!events.length)return;
 if(db){
  const {error}=await db.from("build_events").upsert(events,{onConflict:"build_id,seq"});
  if(error)throw new Error("Event insert: "+error.message);
 } else {
  const item=await localRead(id);
  if(item){const existing=new Map(item.events.map(e=>[e.seq,e]));events.forEach(e=>existing.set(e.seq,e));item.events=[...existing.values()].sort((a,b)=>a.seq-b.seq);await localWrite(id,item);}
 }
}
export async function finishBuild(record:BuildRecord) {
 if(db){
  const {error}=await db.from("builds").update({status:record.status,duration_ms:record.duration_ms,artifacts:record.artifacts,brief:record.artifacts.brief}).eq("id",record.id);
  if(error)throw new Error("Database update: "+error.message);
 }else{
  const item=await localRead(record.id);
  if(item)await localWrite(record.id,{...item,record});
 }
}
export async function getBuild(id:string):Promise<{record:BuildRecord;events:BuildEvent[]}|null>{
 const fixture=exampleById(id);if(fixture)return fixture;
 if(db){
  const {data:build,error}=await db.from("builds").select("id,slug,prompt,status,started_at,duration_ms,artifacts,featured,schema_version").or("id.eq."+id+",slug.eq."+id).maybeSingle();
  if(error||!build)return null;
  const {data:events,error:ee}=await db.from("build_events").select("build_id,seq,t_ms,agent,type,payload").eq("build_id",build.id).order("seq");
  if(ee)throw new Error(ee.message);
  return {record:build as BuildRecord,events:(events||[]) as BuildEvent[]};
 }
 return localRead(id);
}
export async function getGallery():Promise<BuildRecord[]>{
 const fixtures=examples.map(e=>e.record);
 if(db){
  const {data}=await db.from("builds").select("id,slug,prompt,status,started_at,duration_ms,artifacts,featured,schema_version").eq("featured",true).eq("status","completed").order("started_at",{ascending:false}).limit(30);
  return [...(data||[]) as BuildRecord[],...fixtures];
 }
 return fixtures;
}
export async function getUsage(ipHash:string):Promise<{global:number;ip:number;active:number}>{
 if(db){
  const start=new Date();start.setUTCHours(0,0,0,0);
  const {data,error}=await db.from("builds").select("status,ip_hash").gte("started_at",start.toISOString()).limit(1000);
  if(error)throw new Error(error.message);
  const rows=data||[];
  return {global:rows.length,ip:rows.filter(r=>r.ip_hash===ipHash).length,active:rows.filter(r=>r.status==="running").length};
 }
 // Local development is not publicly accessible by default.
 return {global:0,ip:0,active:0};
}
