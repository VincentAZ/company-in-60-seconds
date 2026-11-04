import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

async function database(){
 const db=new PGlite();
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../../supabase/migrations/20261104214302_build_reservations.sql',import.meta.url),'utf8'));
 return db;
}
async function reserve(db:PGlite,ip='a',key=randomUUID(),prompt='A thoughtful community bakery'){
 return db.query<{reserve_build:{created:boolean;record:{id:string}}}>('select public.reserve_build($1,$2,$3,$4,$5)',[randomUUID(),prompt,ip,key,'a'.repeat(64)]);
}
test('admission is disabled until database budget and enablement are explicit',async()=>{
 const db=await database();try{
  await assert.rejects(reserve(db),/GENERATION_DISABLED/);
  await db.exec('update public.build_limits set enabled=true');
  await assert.rejects(reserve(db),/BUILD_LIMIT_REACHED/);
 }finally{await db.close();}
});
test('reservations enforce concurrency, IP/day and global/day, with durable idempotency',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=10000,daily_cap=3,ip_daily_cap=2,concurrency_cap=2');
  const key=randomUUID();const first=await reserve(db,'a',key);
  const retry=await reserve(db,'a',key);
  assert.equal(retry.rows[0].reserve_build.created,false);
  assert.equal(retry.rows[0].reserve_build.record.id,first.rows[0].reserve_build.record.id);
  await assert.rejects(reserve(db,'a',key,'A different community bakery'),/IDEMPOTENCY_CONFLICT/);
  await reserve(db,'a');await assert.rejects(reserve(db,'b'),/BUILD_LIMIT_REACHED/);
  await db.exec("update public.builds set status='completed'");
  await assert.rejects(reserve(db,'a'),/BUILD_LIMIT_REACHED/);
  await reserve(db,'b');await assert.rejects(reserve(db,'c'),/BUILD_LIMIT_REACHED/);
 }finally{await db.close();}
});
test('budget is reserved even for failures and abandoned jobs expire with a terminal event',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000,concurrency_cap=1');
  const first=await reserve(db);
  await db.exec("update public.builds set expires_at=now()-interval '1 minute'");
  await reserve(db,'b');
  const events=await db.query<{type:string;payload:{status:string}}>('select type,payload from public.build_events where build_id=$1',[first.rows[0].reserve_build.record.id]);
  assert.equal(events.rows[0].type,'build.completed');assert.equal(events.rows[0].payload.status,'failed');
  await db.exec("update public.builds set status='failed'");
  await assert.rejects(reserve(db,'c'),/BUILD_LIMIT_REACHED/);
 }finally{await db.close();}
});
test('anonymous and authenticated database clients cannot enumerate builds or reserve spend',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await assert.rejects(db.query('select * from public.builds'),/permission denied/);
   await assert.rejects(db.query('select * from public.build_events'),/permission denied/);
   await assert.rejects(reserve(db),/permission denied/);
   await db.exec('reset role');
  }
 }finally{await db.close();}
});
test('cleanup handles months-old reservations and a saturated event log',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000');
  const build=await reserve(db);
  const id=build.rows[0].reserve_build.record.id;
  await db.query("update public.builds set started_at=now()-interval '90 days',expires_at=now()-interval '89 days' where id=$1",[id]);
  await db.query("insert into public.build_events select $1,generate_series(1,256),0,'System','agent.status','{}'",[id]);
  await db.query('select expire_builds()');
  const result=await db.query<{status:string;duration_ms:number}>('select status,duration_ms from builds where id=$1',[id]);
  assert.equal(result.rows[0].status,'failed');assert.equal(result.rows[0].duration_ms,3600000);
 }finally{await db.close();}
});
test('final snapshot and terminal event commit atomically or both roll back',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000');
  const result=await reserve(db);const id=result.rows[0].reserve_build.record.id;
  const event={build_id:id,seq:1,t_ms:100,agent:'System',type:'build.completed',payload:{status:'completed',duration_ms:100}};
  await assert.rejects(db.query('select finish_build($1,$2,$3,$4,$5)',[id,'partial',100,'{}',JSON.stringify(event)]),/INVALID_TERMINAL_EVENT/);
  assert.equal((await db.query<{status:string}>('select status from builds where id=$1',[id])).rows[0].status,'running');
  assert.equal((await db.query('select * from build_events')).rows.length,0);
  await db.query('select finish_build($1,$2,$3,$4,$5)',[id,'completed',100,'{}',JSON.stringify(event)]);
  assert.equal((await db.query<{status:string}>('select status from builds where id=$1',[id])).rows[0].status,'completed');
  assert.equal((await db.query('select * from build_events')).rows.length,1);
 }finally{await db.close();}
});
test('idempotent retries across IP changes preserve one reservation and its original accounting',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000,concurrency_cap=1');
  const key=randomUUID();const first=await reserve(db,'wifi',key);
  const retried=await reserve(db,'cellular',key);
  assert.equal(retried.rows[0].reserve_build.created,false);
  assert.equal(retried.rows[0].reserve_build.record.id,first.rows[0].reserve_build.record.id);
  const rows=await db.query<{ip_hash:string;reserved_cents:number}>('select ip_hash,reserved_cents from builds');
  assert.deepEqual(rows.rows,[{ip_hash:'wifi',reserved_cents:500}]);
  await assert.rejects(reserve(db,'cellular',key,'A different community bakery'),/IDEMPOTENCY_CONFLICT/);
 }finally{await db.close();}
});
test('finalization rejects missing or inconsistent envelope fields without changing durable state',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000');
  const reserved=await reserve(db);const id=reserved.rows[0].reserve_build.record.id;
  await db.query("insert into build_events values($1,1,50,'System','build.started','{}')",[id]);
  const valid={build_id:id,seq:2,t_ms:100,agent:'System',type:'build.completed',payload:{status:'completed',duration_ms:100}};
  const invalid:unknown[]=[
   null,{}, {...valid,build_id:null},{...valid,agent:'Brand'},
   {...valid,type:null},{...valid,payload:{}},{...valid,payload:{status:'completed'}},
   {...valid,t_ms:99},{...valid,t_ms:'100'},
   {...valid,seq:1},{...valid,seq:3},{...valid,seq:'2'},
   {...valid,seq:1e100},{...valid,seq:2.5}
  ];
  for(const event of invalid){
   await assert.rejects(db.query('select finish_build($1,$2,$3,$4,$5)',[id,'completed',100,'{}',JSON.stringify(event)]),/INVALID_TERMINAL_EVENT/);
  }
  await assert.rejects(db.query('select finish_build($1,$2,$3,$4,$5)',[id,'completed',40,'{}',JSON.stringify({...valid,t_ms:40,payload:{status:'completed',duration_ms:40}})]),/INVALID_TERMINAL_EVENT/);
  assert.equal((await db.query<{status:string}>('select status from builds where id=$1',[id])).rows[0].status,'running');
  assert.equal((await db.query('select * from build_events')).rows.length,1);
  await db.query('select finish_build($1,$2,$3,$4,$5)',[id,'completed',100,'{}',JSON.stringify(valid)]);
  assert.equal((await db.query('select * from build_events')).rows.length,2);
 }finally{await db.close();}
});
test('finalization rejects a noncontiguous persisted stream',async()=>{
 const db=await database();try{
  await db.exec('update public.build_limits set enabled=true,daily_budget_cents=1000');
  const reserved=await reserve(db);const id=reserved.rows[0].reserve_build.record.id;
  await db.query("insert into build_events values($1,2,50,'System','agent.status','{}')",[id]);
  const terminal={build_id:id,seq:3,t_ms:100,agent:'System',type:'build.completed',payload:{status:'completed',duration_ms:100}};
  await assert.rejects(db.query('select finish_build($1,$2,$3,$4,$5)',[id,'completed',100,'{}',JSON.stringify(terminal)]),/INVALID_TERMINAL_EVENT/);
 }finally{await db.close();}
});
test('a locked expired build is read once more and returned for the next poll',async()=>{
 const {createServer}=await import('node:http');
 const {hashToken}=await import('./build-security');
 const token='test-access-token',id=randomUUID();let reads=0,expirations=0;
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url?.startsWith('/rest/v1/builds?')){
   reads++;
   if(reads>3){res.statusCode=503;res.end('{"message":"Too many rereads"}');return;}
   res.end(JSON.stringify({id,slug:id,prompt:'A thoughtful community bakery',status:'running',started_at:new Date().toISOString(),duration_ms:0,artifacts:{},featured:false,schema_version:1,access_hash:hashToken(token),expires_at:'2000-01-01T00:00:00Z'}));
  }else if(req.url==='/rest/v1/rpc/expire_builds'){expirations++;res.end('0');}
  else if(req.url?.startsWith('/rest/v1/build_events?'))res.end('[]');
  else{res.statusCode=404;res.end('{}');}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address==='object');
 const previousUrl=process.env.SUPABASE_URL,previousKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPABASE_URL=`http://127.0.0.1:${address.port}`;process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-key';
 try{
  const {getBuild}=await import('./storage');
  const result=await getBuild(id,{accessToken:token});
  assert.equal(result?.record.status,'running');assert.equal(reads,2);assert.equal(expirations,1);
 }finally{
  if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
  if(previousKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=previousKey;
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 }
});
