/** Explicit developer-only paid verification. Never imported by the app or tests.
 * Usage (only after approval): npx tsx scripts/verify-live.ts --confirm-paid-run
 * Performs ONE build. Failures are not automatically rerun by this script.
 */
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {z} from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type {Agent,BuildEvent,BuildRecord} from '../src/lib/schema';

async function main(){
 if(!process.argv.includes('--confirm-paid-run'))throw new Error('This makes billable API calls. Explicit approval and --confirm-paid-run are required.');
 if(!process.env.ANTHROPIC_API_KEY)throw new Error('ANTHROPIC_API_KEY is not configured.');
 if(process.env.NODE_ENV==='production')throw new Error('Run this locally, outside production.');
 // Verification artifacts are private local files; never touch a configured cloud database.
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 delete process.env.AI_FAST_MODEL;delete process.env.AI_MAIN_MODEL;
 process.env.ENABLE_PUBLIC_BUILDS='false';
 const {generateCompany}=await import('../src/lib/agents');
 const {reduceEvents}=await import('../src/lib/reducer');
 const id=randomUUID(),failures:{agent:Agent;category:string;status?:number;issues?:string[]}[]=[];
 console.log(JSON.stringify({event:'verification.started',id,attempts:1,estimatedMaximumBeforeTaxUSD:1.10}));
 const record=await generateCompany({id,slug:id,prompt:'A neighborhood ceramics workshop membership with shared kilns, beginner classes and open studio time.',ipHash:'local-verification',push:(event:BuildEvent)=>{
  console.log(JSON.stringify({seq:event.seq,t_ms:event.t_ms,agent:event.agent,type:event.type,...(event.type==='artifact.patch'?{path:event.payload.path}:{})}));
 }},{onFailure:(agent,error)=>{
  const category=error instanceof z.ZodError?'schema_validation':error instanceof Anthropic.APIError?(/credit|billing|balance/i.test(error.message)?'provider_billing':'provider_error'):error instanceof Error&&error.name.includes('Abort')?'timeout_or_abort':'generation_error';
  const diagnostic={agent,category,...(error instanceof Anthropic.APIError?{status:error.status}:{}),...(error instanceof z.ZodError?{issues:error.issues.map(i=>i.path.join('.')+': '+i.message)}:{})};
  failures.push(diagnostic);console.log(JSON.stringify({event:'verification.stage_failure',...diagnostic}));
 }});
 const artifactPath=path.join(process.cwd(),'.local-data',id+'.json');
 const stored=JSON.parse(await readFile(artifactPath,'utf8')) as {record:BuildRecord;events:BuildEvent[]};
 assert.deepEqual(reduceEvents(stored.events),record.artifacts);
 assert.deepEqual(stored.record,record);
 assert.equal(stored.events.at(-1)?.t_ms,record.duration_ms);
 const report={id,status:record.status,duration_ms:record.duration_ms,eventCount:stored.events.length,brand:record.artifacts.brand.core?.name??null,sections:record.artifacts.website.sections.length,slides:record.artifacts.pitch.slides.length,replayVerified:true,failures,artifactPath};
 await writeFile(path.join(process.cwd(),'.local-data','live-verification-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({event:'verification.finished',...report}));
 if(record.status!=='completed')process.exitCode=1;
}
main().catch(error=>{console.error(JSON.stringify({event:'verification.failed',category:error instanceof assert.AssertionError?'replay_mismatch':error instanceof Error&&/API key|ANTHROPIC_API_KEY/.test(error.message)?'missing_credentials':'verification_error'}));process.exitCode=1;});
