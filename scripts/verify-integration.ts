/** Local integration only: real PostgreSQL/PostgREST/Next routes, fixture model HTTP.
 * Never uses workstation credentials or a hosted database. Requires Docker and npm run build.
 */
import assert from 'node:assert/strict';
import {spawn,execFileSync,type ChildProcess} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {createServer,request as httpRequest,type Server} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {once} from 'node:events';
import {startModelFixture} from './integration-model';
import {BuildStreamParser,mergeBuildEvents} from '../src/lib/build-stream';
import {reduceEvents} from '../src/lib/reducer';
import type {BuildEvent,BuildRecord} from '../src/lib/schema';

const prefix=`company60-integration-${process.pid}`;
const network=prefix,postgres=prefix+'-db',rest=prefix+'-rest';
const jwtSecret='local-integration-jwt-secret-with-32-characters';
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt=(role:string)=>{const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role,exp:Math.floor(Date.now()/1000)+3600});return body+'.'+createHmac('sha256',jwtSecret).update(body).digest('base64url');};
const docker=(...args:string[])=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const sql=(query:string)=>execFileSync('docker',['exec','-i',postgres,'psql','-U','postgres','-tA','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
async function listen(server:Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');return address.port;}
async function waitUntil(test:()=>Promise<boolean>,label:string,timeout=30000){
 const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await test().catch(()=>false))return;await delay(100);}throw new Error('Timed out: '+label);
}
async function closeServer(server:Server|undefined){if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}}
function cookie(response:Response){const header=response.headers.get('set-cookie');assert.ok(header,'HttpOnly access cookie expected');assert.match(header,/HttpOnly/i);assert.match(header,/SameSite=Lax/i);return header.split(';')[0];}
function summary(label:string){console.log('PASS '+label);}
type Saved={record:BuildRecord;events:BuildEvent[]};

async function main(){
 // Deliberately replace every service credential for child Next; no paid provider endpoint.
 let next:ChildProcess|undefined,proxy:Server|undefined;
 const model=await startModelFixture();let nextLogs='';
 try{
  docker('network','create',network);
  docker('run','--rm','-d','--name',postgres,'--network',network,'-e','POSTGRES_PASSWORD=local-integration-only','postgres:17');
  await waitUntil(async()=>docker('exec',postgres,'pg_isready','-h','127.0.0.1','-U','postgres').includes('accepting'),'PostgreSQL');
  sql("create role anon; create role authenticated; create role service_role bypassrls; create role authenticator login password 'local-integration-only' noinherit; grant anon,authenticated,service_role to authenticator; grant usage on schema public to anon,authenticated,service_role;");
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())sql(await readFile('supabase/migrations/'+file,'utf8'));
  docker('run','--rm','-d','--name',rest,'--network',network,'-p','127.0.0.1::3000','-e',`PGRST_DB_URI=postgres://authenticator:local-integration-only@${postgres}:5432/postgres`,'-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public','-e',`PGRST_JWT_SECRET=${jwtSecret}`,'postgrest/postgrest:v13.0.7');
  const restPort=Number(docker('port',rest,'3000/tcp').split(':').at(-1));
  // Supabase's /rest/v1 gateway prefix is the only adapter this local server adds.
  proxy=createServer((req,res)=>{
   if(!req.url?.startsWith('/rest/v1/')){res.writeHead(404).end();return;}
   const upstream=httpRequest({host:'127.0.0.1',port:restPort,path:req.url.slice('/rest/v1'.length),method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode??502,response.headers);response.pipe(res);});
   upstream.on('error',()=>res.writeHead(502).end());req.pipe(upstream);
  });
  const dbOrigin='http://127.0.0.1:'+await listen(proxy);
  const service=jwt('service_role');
  await waitUntil(async()=>(await fetch(dbOrigin+'/rest/v1/build_limits',{headers:{Authorization:'Bearer '+service}})).ok,'PostgREST schema cache');
  for(const role of ['anon','authenticated']){
   for(const path of ['/builds','/build_events','/build_limits']){
    const r=await fetch(dbOrigin+'/rest/v1'+path,{headers:{Authorization:'Bearer '+jwt(role)}});assert.ok([401,403].includes(r.status),role+' denied '+path);
   }
  }
  summary('anonymous/authenticated REST access denied');
  sql('update build_limits set enabled=true,daily_budget_cents=1000,concurrency_cap=1');
  const portProbe=createServer();const nextPort=await listen(portProbe);await closeServer(portProbe);
  const origin='http://127.0.0.1:'+nextPort;
  const childEnv:NodeJS.ProcessEnv={PATH:process.env.PATH,LANG:'C.UTF-8',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',
   ANTHROPIC_API_KEY:'local-integration-only',ANTHROPIC_AUTH_TOKEN:'',ANTHROPIC_BASE_URL:model.url,
   AI_FAST_MODEL:'claude-haiku-4-5-20251001',AI_MAIN_MODEL:'claude-sonnet-4-6',
   SUPABASE_URL:dbOrigin,SUPABASE_SERVICE_ROLE_KEY:service,ENABLE_PUBLIC_BUILDS:'true',GENERATION_VERIFIED:'true',
   BUILD_ACCESS_SECRET:'local-build-cookie-secret-over-32-characters',IP_HASH_SALT:'local-ip-hash-salt-over-32-characters',VERCEL:'',SITE_URL:origin};
  next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(nextPort)],{env:childEnv,stdio:['ignore','pipe','pipe']});
  next.stdout?.on('data',chunk=>{nextLogs+=String(chunk);});next.stderr?.on('data',chunk=>{nextLogs+=String(chunk);});
  await waitUntil(async()=>(await fetch(origin)).ok,'Next.js');
  const prompt='A local integration fixture for a neighborhood pet hotel';const requestKey=randomUUID();
  const post=(key=requestKey,idea=prompt,extra:Record<string,string>={})=>fetch(origin+'/api/build',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':key,...extra},body:JSON.stringify({prompt:idea})});
  const badOrigin=await post(randomUUID(),prompt,{Origin:'https://elsewhere.invalid'});assert.equal(badOrigin.status,403);
  const tooLarge=await fetch(origin+'/api/build',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({prompt:'x'.repeat(3000)})});assert.equal(tooLarge.status,413);
  assert.equal(model.stats.requests.Brief,0);
  summary('invalid requests rejected before provider work');
  const first=await post();assert.equal(first.status,200);const id=first.headers.get('x-build-id');assert.ok(id);
  const ownerCookie=cookie(first);assert.ok(first.body);const reader=first.body.getReader(),parser=new BuildStreamParser();
  const streamed:BuildEvent[]=[];const decoder=new TextDecoder();
  while(!streamed.some(e=>e.agent==='Brief'&&e.type==='agent.completed')){
   const chunk=await reader.read();assert.equal(chunk.done,false);streamed.push(...parser.push(decoder.decode(chunk.value,{stream:true})));
  }
  await reader.cancel();
  const repeats=await Promise.all(Array.from({length:8},()=>post()));
  for(const r of repeats){assert.equal(r.status,200);assert.equal((await r.json()).id,id);assert.equal(cookie(r),ownerCookie);}
  assert.equal(model.stats.requests.Brief,1);
  assert.equal((await post(randomUUID())).status,429);
  assert.equal((await post(requestKey,'A different integration fixture idea')).status,409);
  summary('disconnect + eight idempotent retries preserve one reservation; concurrent cap enforced');
  const read=async(after=0,auth=ownerCookie)=>fetch(`${origin}/api/builds/${id}?after=${after}`,{headers:auth?{Cookie:auth}:{}});
  let running:Saved|undefined;
  await waitUntil(async()=>{const r=await read();assert.equal(r.status,200);running=await r.json();return running!.events.some(e=>e.agent==='Brief'&&e.type==='agent.completed');},'batched events persisted while model held');
  assert.equal(running!.record.status,'running');assert.equal((await read(0,'')).status,404);
  assert.equal((await fetch(`${origin}/b/${id}`)).status,404);assert.equal((await fetch(`${origin}/api/og/${id}`)).status,404);
  for(const secret of ['access_hash','ip_hash','request_key','reserved_cents','expires_at'])assert.equal(Object.hasOwn(running!.record,secret),false);
  const lastSeen=streamed.at(-1)!.seq;
  // JSONB deliberately reorders keys. Recovery must accept stream/database overlap.
  assert.doesNotThrow(()=>mergeBuildEvents(streamed,running!.events));
  summary('in-flight events survive disconnect, overlap merges, and private reads stay private');
  model.release();let complete:Saved|undefined;
  await waitUntil(async()=>{const r=await read();complete=await r.json();return complete!.record.status!=='running';},'detached generation completes');
  assert.equal(complete!.record.status,'completed');assert.equal(complete!.events.at(-1)?.type,'build.completed');
  assert.deepEqual(reduceEvents(complete!.events),complete!.record.artifacts);
  const raw=JSON.parse(sql(`select json_build_object('record',artifacts,'events',(select json_agg(e order by seq) from build_events e where build_id='${id}')) from builds where id='${id}';`));
  assert.deepEqual(reduceEvents(raw.events),raw.record);
  const resumed:Saved=await (await read(lastSeen)).json();assert.ok(resumed.events.every(e=>e.seq>lastSeen));
  assert.deepEqual(reduceEvents(mergeBuildEvents(streamed,resumed.events)),complete!.record.artifacts);
  assert.deepEqual(model.stats.requests,{Brief:1,Brand:1,Finance:1,Website:1,Pitch:1});
  summary('five SDK HTTP calls, persisted replay, after-seq recovery, and atomic snapshot agree');
  const share=await fetch(`${origin}/api/builds/${id}/share`,{method:'POST',headers:{Origin:origin,Cookie:ownerCookie}});assert.equal(share.status,200);
  const sharedURL=(await share.json()).url;const exchange=await fetch(sharedURL,{redirect:'manual'});assert.equal(exchange.status,307);
  const visitorCookie=cookie(exchange);assert.equal(exchange.headers.get('referrer-policy'),'no-referrer');assert.equal(exchange.headers.get('cache-control'),'private, no-store');
  const replay=await fetch(origin+'/b/'+id,{headers:{Cookie:visitorCookie}});assert.equal(replay.status,200);
  const html=await replay.text();assert.match(html,/Private concept/);assert.match(html,/noindex/);
  const site=await fetch(origin+'/c/'+id,{headers:{Cookie:visitorCookie}});assert.equal(site.status,200);
  assert.equal((await fetch(sharedURL.replace(/token=.*/, 'token='+'0'.repeat(64)),{redirect:'manual'})).status,404);
  const home=await (await fetch(origin)).text();assert.equal(home.includes('/b/'+id),false);
  summary('explicit sharing opens replay/website; private metadata and gallery exclusion hold');
  // Exhaust the remaining budget with an abandoned reservation, then expire on read.
  const abandonedId=randomUUID();const token='1'.repeat(64);
  const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(token).digest('hex');
  sql(`select reserve_build('${abandonedId}','An abandoned integration fixture','another-ip','${randomUUID()}','${hash}'); update builds set expires_at=now()-interval '1 minute' where id='${abandonedId}';`);
  const expired=await fetch(origin+'/api/builds/'+abandonedId,{headers:{Cookie:`build_${abandonedId}=${token}`}});assert.equal(expired.status,200);const failed=await expired.json();assert.equal(failed.record.status,'failed');assert.equal(failed.events.at(-1).payload.status,'failed');
  assert.equal((await post(randomUUID())).status,429);assert.equal(model.stats.requests.Brief,1);
  summary('abandoned reservation expires honestly; failed reservation still consumes budget');
  console.log('Local integration passed. All model responses were test fixtures; no paid API calls.');
 }catch(error){
  console.error(nextLogs.slice(-6000));throw error;
 }finally{
  model.release();await model.close();await closeServer(proxy);
  if(next&&next.exitCode===null){next.kill('SIGTERM');await Promise.race([once(next,'exit'),delay(3000)]);if(next.exitCode===null)next.kill('SIGKILL');}
  for(const name of [rest,postgres]){try{docker('rm','-f',name);}catch{}}
  try{docker('network','rm',network);}catch{}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
