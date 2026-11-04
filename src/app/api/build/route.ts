import {randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {after} from 'next/server';
import {generateCompany} from '@/lib/agents';
import {reserveBuild} from '@/lib/storage';
import {accessCookie,buildToken,generationEnabled,hashIp,hashToken} from '@/lib/build-security';
import type {BuildEvent} from '@/lib/schema';
export const runtime='nodejs';
export const maxDuration=300;
export async function POST(req:Request){
 if(!generationEnabled())return Response.json({error:'Live generation is currently disabled. Explore the demo replay gallery.'},{status:503});
 const origin=req.headers.get('origin');
 if(!origin||origin!==new URL(req.url).origin)return Response.json({error:'Same-origin requests required.'},{status:403});
 if(!req.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON required.'},{status:415});
 const requestKey=req.headers.get('idempotency-key')??'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))return Response.json({error:'A UUID idempotency key is required.'},{status:400});
 let value:unknown;
 try{
  const reader=req.body?.getReader();if(!reader)throw new Error();
  let bytes=0,text='';const decoder=new TextDecoder();
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.length;if(bytes>2048){await reader.cancel();return Response.json({error:'Request too large.'},{status:413});}text+=decoder.decode(chunk.value,{stream:true});}
  const body=JSON.parse(text+decoder.decode());value=body?.prompt;
 }catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 if(typeof value!=='string'||value.trim().length<10||value.trim().length>200||/[\u0000-\u001f\u007f]/.test(value))return Response.json({error:'Describe your business in 10–200 characters.'},{status:400});
 // Vercel overwrites x-vercel-forwarded-for. Never trust caller-supplied x-forwarded-for.
 const ip=process.env.VERCEL?req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim():'127.0.0.1';
 if(!ip||!isIP(ip))return Response.json({error:'Unable to validate request origin.'},{status:503});
 const id=randomUUID(),prompt=value.trim(),ipHash=hashIp(ip);
 let reservation;
 try{reservation=await reserveBuild({id,prompt,ipHash,requestKey,accessHash:hashToken(buildToken(id))});}
 catch(e){
  const message=e instanceof Error?e.message:'';
  const status=message.includes('BUILD_LIMIT_REACHED')?429:message.includes('IDEMPOTENCY_CONFLICT')?409:503;
  return Response.json({error:status===429?'The studio has reached its build budget. Explore a replay.':status===409?'This request key already belongs to a different idea.':'Live generation is unavailable.'},{status});
 }
 const record=reservation.record;
 const headers=new Headers({'Cache-Control':'private, no-store','X-Build-Id':record.id});
 headers.set('Set-Cookie',`${accessCookie(record.id)}=${buildToken(record.id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`);
 if(!reservation.created)return Response.json({id:record.id},{headers});
 const encoder=new TextEncoder();let connected=true;
 let controller:ReadableStreamDefaultController<Uint8Array>;
 const stream=new ReadableStream<Uint8Array>({start(c){controller=c;},cancel(){connected=false;}});
 const send=(data:string)=>{if(connected){try{controller.enqueue(encoder.encode(data));}catch{connected=false;}}};
 send(': connected\n\n');
 const work=generateCompany({id:record.id,slug:record.slug,prompt,ipHash,precreated:record,signal:AbortSignal.timeout(240000),push:(event:BuildEvent)=>send('data: '+JSON.stringify(event)+'\n\n')})
  .catch(()=>{send('event: error\ndata: {"error":"Generation interrupted. Reconnecting to saved work."}\n\n');})
  .finally(()=>{if(connected){try{controller.close();}catch{}}});
 // Register the already running promise to preserve execution on client disconnect.
 after(()=>work);
 headers.set('Content-Type','text/event-stream; charset=utf-8');headers.set('X-Accel-Buffering','no');
 return new Response(stream,{headers});
}
