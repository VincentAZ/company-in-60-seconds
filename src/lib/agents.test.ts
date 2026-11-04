import {test} from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import assert from "node:assert/strict";
import {setTimeout as delay} from "node:timers/promises";
import {generateCompany,type ModelTransport} from "./agents";
import {examples} from "./fixtures";
import {reduceEvents} from "./reducer";
import type {BuildEvent,BuildRecord} from "./schema";

const source=examples[0].record.artifacts;
function memoryStore(){
 const events:BuildEvent[]=[];let record:BuildRecord|undefined;let created=0;
 return {events,get record(){return record;},get created(){return created;},
  store:{create:async(r:BuildRecord)=>{record=r;created++;},save:async(_id:string,batch:BuildEvent[])=>{events.push(...structuredClone(batch));},finish:async(r:BuildRecord,terminal?:BuildEvent)=>{record=structuredClone(r);if(terminal)events.push(structuredClone(terminal));}}
 };
}
function successfulModel(onBrandWait?:()=>Promise<void>):ModelTransport{
 return {
  single:async prompt=>prompt.startsWith('Evaluate')?source.brief:source.finance,
  lines:async(prompt,_model,_signal,accept)=>{
   if(prompt.startsWith('Build a brand')){
    accept({path:'core',value:source.brand.core});await onBrandWait?.();accept({path:'logo',value:source.brand.logo});
   }else if(prompt.startsWith('Produce an unusually')){
    accept({path:'setup',value:source.website.setup});for(const section of source.website.sections)accept({path:'sections',value:section});
   }else{
    const slides=[...source.pitch.slides];
    while(slides.length<7)slides.splice(slides.length-1,0,slides[2]);
    for(const slide of slides)accept({path:'slides',value:slide});
   }
  }
 };
}
const opts={id:'test-build',slug:'test-build',prompt:'A thoughtful coffee subscription',ipHash:'test',push:()=>{}};

test("handoff uses brand core + finance without waiting for logo, and persisted replay matches final snapshot",async()=>{
 const memory=memoryStore(),pushed:BuildEvent[]=[];
 let releaseLogo!:()=>void;const logoWait=new Promise<void>(resolve=>{releaseLogo=resolve;});
 const model=successfulModel(()=>logoWait),original=model.lines;
 model.lines=async(...args)=>{if(args[0].startsWith('Produce an unusually'))releaseLogo();return original(...args);};
 const record=await generateCompany({...opts,push:event=>pushed.push(event)},{model,store:memory.store});
 assert.equal(record.status,'completed');
 const core=pushed.find(e=>e.type==='artifact.patch'&&e.payload.path==='core')!;
 const finance=pushed.find(e=>e.type==='artifact.patch'&&e.payload.path==='assumptions')!;
 const handoff=pushed.find(e=>e.type==='handoff')!;
 const website=pushed.find(e=>e.agent==='Website'&&e.type==='agent.started')!;
 const logo=pushed.find(e=>e.type==='artifact.patch'&&e.payload.path==='logo')!;
 assert.ok(handoff.seq>core.seq&&handoff.seq>finance.seq);assert.ok(website.seq<logo.seq);
 assert.deepEqual(memory.events,pushed);assert.deepEqual(reduceEvents(memory.events),record.artifacts);
 assert.equal(memory.events.at(-1)?.type,'build.completed');
});
test("a source failure settles its sibling before a terminal event, without unhandled rejections",async()=>{
 const memory=memoryStore();let financeSettled=false;
 const model=successfulModel();
 model.single=async(prompt,_model,signal)=>{
  if(prompt.startsWith('Evaluate'))return source.brief;
  try{await delay(20,undefined,{signal});return source.finance;}finally{financeSettled=true;}
 };
 model.lines=async()=>{throw new Error('Secret provider detail must not leak');};
 const record=await generateCompany(opts,{model,store:memory.store});
 assert.equal(record.status,'failed');assert.ok(financeSettled);
 assert.equal(memory.events.some(e=>e.agent==='Website'),false);
 assert.equal(memory.events.at(-1)?.type,'build.completed');
 assert.equal(JSON.stringify(memory.events).includes('Secret provider'),false);
 const count=memory.events.length;await delay(30);assert.equal(memory.events.length,count);
});
test("declined brief never starts downstream calls",async()=>{
 const memory=memoryStore();let calls=0;const model=successfulModel();
 model.single=async()=>{calls++;return {...source.brief,allowed:false,reason:'Disallowed idea'};};
 model.lines=async()=>{throw new Error('Must not run');};
 const record=await generateCompany(opts,{model,store:memory.store});
 assert.equal(record.status,'failed');assert.equal(calls,1);assert.equal(memory.events.some(e=>e.type==='handoff'),false);
});
test("viewer disconnect does not cancel generation and reserved record is not inserted twice",async()=>{
 const memory=memoryStore();
 const reservation:BuildRecord={...examples[0].record,id:opts.id,slug:opts.slug,prompt:opts.prompt,status:'running'};
 const record=await generateCompany({...opts,precreated:reservation,push:()=>{throw new Error('Viewer disconnected');}},{model:successfulModel(),store:memory.store});
 assert.equal(record.status,'completed');assert.equal(memory.created,0);assert.deepEqual(reduceEvents(memory.events),record.artifacts);
});
test("explicit abort stops model work and records an honest terminal failure",async()=>{
 const memory=memoryStore(),controller=new AbortController();controller.abort();let calls=0;
 const model=successfulModel();model.single=async()=>{calls++;return source.brief;};
 const record=await generateCompany({...opts,signal:controller.signal},{model,store:memory.store});
 assert.equal(record.status,'failed');assert.equal(calls,0);assert.equal(memory.events.at(-1)?.payload.status,'failed');
});
test("persistence failure aborts work and never reports a durable completed snapshot",async()=>{
 const memory=memoryStore();let finished=false;
 await assert.rejects(generateCompany(opts,{model:successfulModel(()=>delay(10)),store:{...memory.store,save:async()=>{throw new Error('Database unavailable');},finish:async()=>{finished=true;}}}),/persistence failed/);
 assert.equal(finished,false);
});

test("actual Anthropic SDK serializes bounded system/user requests and parses a streamed response",async()=>{
 const {createModelTransport}=await import('./agents');
 const requests:Record<string,unknown>[]=[];
 const api=new Anthropic({apiKey:'unit-test-only',maxRetries:0,fetch:async(_url,init)=>{
  const body=JSON.parse(String(init?.body));requests.push(body);
  const base={id:'msg_test',type:'message',role:'assistant',model:'claude-sonnet-4-6',content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:10,output_tokens:10}};
  if(!body.stream)return Response.json({...base,content:[{type:'text',text:'{"safe":true}'}],stop_reason:'end_turn'});
  const events=[
   {type:'message_start',message:base},
   {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
   {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'{"path":"core",'}},
   {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'"value":{}}\n'}},
   {type:'content_block_stop',index:0},
   {type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:10}},
   {type:'message_stop'}
  ];
  return new Response(events.map(event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''),{headers:{'Content-Type':'text/event-stream'}});
 }});
 const model=createModelTransport(()=>api),signal=new AbortController().signal;
 assert.deepEqual(await model.single('untrusted idea','claude-sonnet-4-6',signal),{safe:true});
 const lines:unknown[]=[];await model.lines('untrusted idea','claude-sonnet-4-6',signal,v=>lines.push(v),2);
 assert.deepEqual(lines,[{path:'core',value:{}}]);
 assert.equal(requests[0].max_tokens,1600);assert.equal(requests[1].max_tokens,4800);
 assert.equal(typeof requests[0].system,'string');assert.deepEqual(requests[0].messages,[{role:'user',content:'untrusted idea'}]);
});
test("actual Anthropic SDK truncated output is rejected",async()=>{
 const {createModelTransport}=await import('./agents');
 const api=new Anthropic({apiKey:'unit-test-only',maxRetries:0,fetch:async()=>Response.json({id:'msg_test',type:'message',role:'assistant',model:'claude-sonnet-4-6',content:[{type:'text',text:'{"safe":true}'}],stop_reason:'max_tokens',stop_sequence:null,usage:{input_tokens:10,output_tokens:1600}})});
 await assert.rejects(createModelTransport(()=>api).single('idea','claude-sonnet-4-6',new AbortController().signal),/incomplete/);
});
test("only transient pre-patch errors retry once",async()=>{
 const memory=memoryStore(),model=successfulModel();let calls=0;
 model.single=async()=>{calls++;throw new Anthropic.APIError(429,{error:{message:'rate limit'}},'rate limit',new Headers());};
 const record=await generateCompany(opts,{model,store:memory.store});
 assert.equal(record.status,'failed');assert.equal(calls,2);assert.equal(memory.events.filter(e=>e.type==='agent.retry').length,1);
});

test("model cost controls reject unpriced overrides and oversized UTF-8 inputs before any API call",async()=>{
 const {validateModelRequest}=await import('./agents');
 assert.throws(()=>validateModelRequest('claude-opus-unpriced','small input'),/cost configuration/);
 assert.throws(()=>validateModelRequest('claude-sonnet-4-6','☀'.repeat(16000)),/safety limit/);
 assert.doesNotThrow(()=>validateModelRequest('claude-haiku-4-5-20251001','A thoughtful coffee subscription'));
});
test("a transient logo failure after core emission never duplicates patches or blocks downstream artifacts",async()=>{
 const memory=memoryStore(),model=successfulModel(),original=model.lines;let brandCalls=0;
 model.lines=async(...args)=>{
  if(args[0].startsWith('Build a brand')){
   brandCalls++;args[3]({path:'core',value:source.brand.core});
   throw new Anthropic.APIError(500,{error:{message:'temporary'}},'temporary',new Headers());
  }
  return original(...args);
 };
 const record=await generateCompany(opts,{model,store:memory.store});
 assert.equal(record.status,'partial');assert.equal(brandCalls,1);
 assert.equal(record.artifacts.brand.logo,null);assert.ok(record.artifacts.website.sections.length>=6);
 assert.deepEqual(reduceEvents(memory.events),record.artifacts);
});

test("terminal event and persisted duration share the same replay endpoint",async()=>{
 const memory=memoryStore();let clock=0;
 const record=await generateCompany(opts,{model:successfulModel(),store:memory.store,now:()=>++clock});
 assert.equal(memory.events.at(-1)?.t_ms,record.duration_ms);
 assert.equal(memory.events.at(-1)?.payload.duration_ms,record.duration_ms);
});

test("final batch persistence failure never publishes terminal success",async()=>{
 const memory=memoryStore(),pushed:BuildEvent[]=[];let saves=0;let finished=false;
 await assert.rejects(generateCompany({...opts,push:event=>pushed.push(event)},{model:successfulModel(),store:{...memory.store,save:async(id,batch)=>{
  saves++;if(batch.some(e=>e.agent==='Pitch'&&e.type==='agent.completed'))throw new Error('Final batch lost');
  await memory.store.save(id,batch);
 },finish:async()=>{finished=true;}}}),/persistence failed/);
 assert.ok(saves>1);assert.equal(finished,false);
 assert.equal(pushed.some(e=>e.type==='build.completed'),false);
});
test("snapshot transaction failure never publishes terminal success",async()=>{
 const memory=memoryStore(),pushed:BuildEvent[]=[];
 await assert.rejects(generateCompany({...opts,push:event=>pushed.push(event)},{model:successfulModel(),store:{...memory.store,finish:async()=>{throw new Error('Snapshot transaction failed');}}}),/Snapshot transaction failed/);
 assert.ok(memory.events.length>0);assert.equal(memory.events.some(e=>e.type==='build.completed'),false);
 assert.equal(pushed.some(e=>e.type==='build.completed'),false);
});
test("terminal success is published only after the snapshot transaction commits",async()=>{
 const memory=memoryStore(),order:string[]=[];
 await generateCompany({...opts,push:event=>{if(event.type==='build.completed')order.push('terminal');}},{model:successfulModel(),store:{...memory.store,finish:async(record,event)=>{await delay(5);await memory.store.finish(record,event);order.push('commit');}}});
 assert.deepEqual(order,['commit','terminal']);
});
