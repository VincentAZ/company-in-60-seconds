/**
 * Local integration-test double for Anthropic's Messages API. This serves only
 * hand-authored fixture data; it performs no model inference and makes no outbound
 * requests. Never import this helper into the application or deploy it as a service.
 */
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {examples} from '../src/lib/fixtures';

type Stage='Brief'|'Brand'|'Finance'|'Website'|'Pitch';
type Counts=Record<Stage,number>;
const counts=():Counts=>({Brief:0,Brand:0,Finance:0,Website:0,Pitch:0});
const source=examples[0].record.artifacts;
const fakeKey='local-integration-only';

export interface ModelFixture {
 url:string;
 release:()=>void;
 close:()=>Promise<void>;
 stats:{requests:Counts;completed:Counts;rejected:number};
}

function stageFor(prompt:string):Stage|undefined {
 if(prompt.startsWith('Evaluate and structure'))return 'Brief';
 if(prompt.startsWith('Build a brand'))return 'Brand';
 if(prompt.startsWith('Create reasonable'))return 'Finance';
 if(prompt.startsWith('Produce an unusually'))return 'Website';
 if(prompt.startsWith('Produce a striking'))return 'Pitch';
}

async function readBody(req:IncomingMessage):Promise<unknown>{
 const chunks:Buffer[]=[];let bytes=0;
 for await(const chunk of req){
  const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
  bytes+=buffer.length;
  if(bytes>32768)throw new Error('Fixture request too large');
  chunks.push(buffer);
 }
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** A held fixture lets tests disconnect after Brief, then release remaining work. */
export async function startModelFixture(options:{holdAfterBrief?:boolean}={}):Promise<ModelFixture>{
 const stats:ModelFixture['stats']={requests:counts(),completed:counts(),rejected:0};
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 if(options.holdAfterBrief===false)release();
 let closed=false;
 const replies=new Set<ServerResponse>();
 const error=(res:ServerResponse,status:number,message:string)=>{
  stats.rejected++;
  if(res.destroyed)return;
  res.writeHead(status,{'Content-Type':'application/json'});
  res.end(JSON.stringify({type:'error',error:{type:'invalid_request_error',message}}));
 };
 const serve=async(req:IncomingMessage,res:ServerResponse)=>{
  if(req.method!=='POST'||req.url!=='/v1/messages'){error(res,404,'Unknown local fixture route');return;}
  if(req.headers['x-api-key']!==fakeKey){error(res,401,'Local fixture key required');return;}
  const body=await readBody(req) as {model?:unknown;max_tokens?:unknown;messages?:{role?:unknown;content?:unknown}[];stream?:unknown};
  const prompt=body.messages?.[0]?.content;
  const stage=typeof prompt==='string'?stageFor(prompt):undefined;
  if(!stage||typeof body.model!=='string'||!['claude-haiku-4-5-20251001','claude-sonnet-4-6'].includes(body.model)){
   error(res,400,'Unsupported fixture stage or model');return;
  }
  const streaming=stage!=='Brief'&&stage!=='Finance';
  if(body.stream!==streaming&&!(body.stream===undefined&&!streaming)){
   error(res,400,'Unexpected fixture streaming mode');return;
  }
  if(body.max_tokens!==(streaming?4800:1600)){
   error(res,400,'Unexpected fixture token bound');return;
  }
  stats.requests[stage]++;
  if(stage!=='Brief')await gate;
  if(closed||res.destroyed)return;
  const message={id:`msg_fixture_${stage}_${stats.requests[stage]}`,type:'message',role:'assistant',model:body.model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:10,output_tokens:0}};
  if(!streaming){
   if(stage==='Finance')await delay(200);
   if(closed||res.destroyed)return;
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify({...message,content:[{type:'text',text:JSON.stringify(stage==='Brief'?source.brief:source.finance)}],stop_reason:'end_turn',usage:{input_tokens:10,output_tokens:10}}));
   stats.completed[stage]++;
   return;
  }
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});
  const event=(value:{type:string;[key:string]:unknown})=>{
   if(!res.destroyed&&!closed)res.write(`event: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`);
  };
  event({type:'message_start',message});
  event({type:'content_block_start',index:0,content_block:{type:'text',text:''}});
  const slides=[...source.pitch.slides];
  while(slides.length<7)slides.splice(slides.length-1,0,slides[2]);
  const lines=stage==='Brand'?[{path:'core',value:source.brand.core},{path:'logo',value:source.brand.logo}]
   :stage==='Website'?[{path:'setup',value:source.website.setup},...source.website.sections.map(value=>({path:'sections',value}))]
   :slides.map(value=>({path:'slides',value}));
  for(let index=0;index<lines.length;index++){
   await delay(stage==='Brand'?(index===0?200:400):60);
   if(closed||res.destroyed)return;
   const text=JSON.stringify(lines[index])+'\n';
   // Split each JSONL object across protocol events, exercising incremental parsing.
   for(let offset=0;offset<text.length;offset+=97){
    event({type:'content_block_delta',index:0,delta:{type:'text_delta',text:text.slice(offset,offset+97)}});
   }
  }
  event({type:'content_block_stop',index:0});
  event({type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:10}});
  event({type:'message_stop'});
  res.end();stats.completed[stage]++;
 };
 const server=createServer((req,res)=>{
  replies.add(res);res.once('close',()=>replies.delete(res));
  void serve(req,res).catch(()=>{
   if(!res.headersSent)error(res,400,'Malformed local fixture request');
   else res.destroy();
  });
 });
 await new Promise<void>((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});
 });
 const address=server.address();
 if(!address||typeof address==='string')throw new Error('Local fixture did not bind TCP');
 return {url:`http://127.0.0.1:${address.port}`,stats,release,close:async()=>{
  if(closed)return;
  closed=true;release();for(const reply of replies)reply.destroy();
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }};
}
