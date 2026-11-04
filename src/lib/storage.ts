import {createClient} from '@supabase/supabase-js';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import type {BuildEvent,BuildRecord} from './schema';
import {examples,exampleById} from './fixtures';
import {reduceEvents} from './reducer';
import {validBuildId,tokenMatches} from './build-security';

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const db=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const local=path.join(process.cwd(),'.local-data');
const columns='id,slug,prompt,status,started_at,duration_ms,artifacts,featured,schema_version';
type Stored={record:BuildRecord;events:BuildEvent[]};
const storeFile=(id:string)=>path.join(local,id+'.json');
async function localRead(id:string):Promise<Stored|null>{
 if(!validBuildId(id))return null;
 try{return JSON.parse(await readFile(storeFile(id),'utf8'));}catch{return null;}
}
async function localWrite(id:string,item:Stored){
 if(!validBuildId(id))throw new Error('Invalid build identifier');
 if(process.env.NODE_ENV==='production')throw new Error('Production persistence required');
 await mkdir(local,{recursive:true});
 const file=storeFile(id),temp=file+'.tmp';
 await writeFile(temp,JSON.stringify(item),'utf8');await rename(temp,file);
}
export function persistentDbEnabled(){return Boolean(db);}
export async function reserveBuild(input:{id:string;prompt:string;ipHash:string;requestKey:string;accessHash:string}):Promise<{created:boolean;record:BuildRecord}>{
 if(!db)throw new Error('PERSISTENCE_REQUIRED');
 const {data,error}=await db.rpc('reserve_build',{p_id:input.id,p_prompt:input.prompt,p_ip_hash:input.ipHash,p_request_key:input.requestKey,p_access_hash:input.accessHash});
 if(error)throw new Error(error.message);
 return data;
}
export async function createBuild(record:BuildRecord,ipHash:string){
 if(db)throw new Error('Database builds must use atomic reservation');
 void ipHash;await localWrite(record.id,{record,events:[]});
}
export async function saveEventBatch(id:string,events:BuildEvent[]){
 if(!events.length)return;
 if(events.some(e=>e.build_id!==id))throw new Error('Event build mismatch');
 if(db){
  const {error}=await db.from('build_events').upsert(events,{onConflict:'build_id,seq',ignoreDuplicates:true});
  if(error)throw new Error('Event persistence failed');
 }else{
  const item=await localRead(id);if(!item)throw new Error('Build missing');
  const existing=new Map(item.events.map(e=>[e.seq,e]));events.forEach(e=>{if(!existing.has(e.seq))existing.set(e.seq,e);});
  item.events=[...existing.values()].sort((a,b)=>a.seq-b.seq);await localWrite(id,item);
 }
}
export async function finishBuild(record:BuildRecord,terminal?:BuildEvent){
 if(!terminal||terminal.type!=='build.completed'||terminal.build_id!==record.id)throw new Error('Terminal event required');
 if(db){
  const {error}=await db.rpc('finish_build',{p_id:record.id,p_status:record.status,p_duration_ms:record.duration_ms,p_artifacts:record.artifacts,p_event:terminal});
  if(error)throw new Error('Build persistence failed');
 }else{
  const item=await localRead(record.id);if(!item)throw new Error('Build missing');
  await localWrite(record.id,{record,events:[...item.events,terminal]});
 }
}
export async function getBuild(id:string,options:{accessToken?:string;after?:number}={}):Promise<Stored|null>{
 if(!validBuildId(id))return null;
 const fixture=exampleById(id);
 if(fixture)return {record:fixture.record,events:fixture.events.filter(e=>e.seq>(options.after??0))};
 if(!db)return null; // Local generation logs are private developer artifacts.
 const read=()=>db.from('builds').select('id,slug,prompt,status,started_at,duration_ms,artifacts,featured,schema_version,access_hash,expires_at').eq('id',id).maybeSingle();
 let {data:build,error}=await read();
 if(error)throw new Error('Build read failed');
 if(!build||(!build.featured&&!tokenMatches(options.accessToken,build.access_hash)))return null;
 if(build.status==='running'&&Date.parse(build.expires_at)<Date.now()){
  const {error:expired}=await db.rpc('expire_builds');if(expired)throw new Error('Build recovery failed');
  // SKIP LOCKED may leave a build running while another transaction finishes it.
  // Re-read once, then let the client's next poll retry instead of recursing forever.
  ({data:build,error}=await read());
  if(error)throw new Error('Build read failed');
  if(!build||(!build.featured&&!tokenMatches(options.accessToken,build.access_hash)))return null;
 }
 const {data:events,error:ee}=await db.from('build_events').select('build_id,seq,t_ms,agent,type,payload').eq('build_id',build.id).order('seq').limit(256);
 if(ee)throw new Error('Event read failed');
 const {access_hash,expires_at,...publicRecord}=build;void access_hash;void expires_at;
 const all=(events??[]) as BuildEvent[];
 const record=publicRecord as BuildRecord;
 record.artifacts=reduceEvents(all);
 return {record,events:all.filter(e=>e.seq>(options.after??0))};
}
export async function getGallery():Promise<BuildRecord[]>{
 const fixtures=examples.map(e=>e.record);
 if(db){
  const {data,error}=await db.from('builds').select(columns).eq('featured',true).eq('status','completed').order('started_at',{ascending:false}).limit(30);
  if(error)return fixtures;
  return [...(data??[]) as BuildRecord[],...fixtures];
 }
 return fixtures;
}
