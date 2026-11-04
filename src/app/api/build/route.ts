import {randomUUID,createHash} from "node:crypto";
import {generateCompany} from "@/lib/agents";
import {getUsage,persistentDbEnabled} from "@/lib/storage";
import type {BuildEvent} from "@/lib/schema";
export const runtime="nodejs";
export const maxDuration=300;
let concurrent=0;
export async function POST(req:Request){
 const enabled=process.env.ENABLE_PUBLIC_BUILDS==="true"||process.env.NODE_ENV!=="production";
 if(!enabled)return Response.json({error:"Live generation is currently disabled. Explore the replay gallery instead."},{status:503});
 if(process.env.NODE_ENV==="production"&&!persistentDbEnabled())return Response.json({error:"The persistence service is not configured."},{status:503});
 if(!process.env.ANTHROPIC_API_KEY)return Response.json({error:"Live AI generation needs an Anthropic API key. Replay examples are ready."},{status:503});
 let body:unknown;
 try{body=await req.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
 const value=body&&typeof body==="object"&&"prompt" in body?(body as {prompt:unknown}).prompt:null;
 if(typeof value!=="string"||value.trim().length<10||value.trim().length>200)return Response.json({error:"Describe your business in 10–200 characters."},{status:400});
 const prompt=value.trim();
 const ip=(req.headers.get("x-forwarded-for")?.split(",")[0]||"local").trim();
 const ipHash=createHash("sha256").update((process.env.IP_HASH_SALT||"dev-only")+ip).digest("hex");
 if(concurrent>=Number(process.env.MAX_CONCURRENT_BUILDS||2))return Response.json({error:"The studio is busy. Explore a replay and try again."},{status:429});
 try{
  const usage=await getUsage(ipHash);
  if(usage.global>=Number(process.env.MAX_DAILY_BUILDS||20)||usage.ip>=Number(process.env.MAX_IP_DAILY_BUILDS||3)||usage.active>=Number(process.env.MAX_CONCURRENT_BUILDS||2))
   return Response.json({error:"Today's live-build limit has been reached. Replays are always free."},{status:429});
 }catch{return Response.json({error:"Unable to validate generation limits."},{status:503});}
 const id=randomUUID(),slug=id.slice(0,8);
 const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   concurrent++;
   const push=(event:BuildEvent)=>{try{controller.enqueue(encoder.encode("data: "+JSON.stringify(event)+"\n\n"));}catch{}};
   controller.enqueue(encoder.encode(": connected\n\n"));
   void generateCompany({id,slug,prompt,ipHash,push})
   .catch(e=>{try{controller.enqueue(encoder.encode("event: error\ndata: "+JSON.stringify({error:e instanceof Error?e.message:"Generation failed"})+"\n\n"));}catch{}})
   .finally(()=>{concurrent=Math.max(0,concurrent-1);try{controller.close();}catch{}});
  }
 });
 return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"}});
}
