import assert from "node:assert/strict";
import test from "node:test";
import {examples,exampleById} from "./fixtures";
import {emptyArtifacts,reduceEvents} from "./reducer";

test("twelve distinctive, explicitly fictional fixtures have independent snapshots",()=>{
 assert.equal(examples.length,12);
 assert.equal(new Set(examples.map(e=>e.record.slug)).size,12);
 assert.equal(new Set(examples.map(e=>JSON.stringify(e.record.artifacts.brand.logo))).size,12);
 for(const {record,events} of examples){
  assert.deepEqual(reduceEvents(events),record.artifacts,record.id);
  assert.equal(events[0].payload.source,"fixture");
  assert.match(record.artifacts.brief!.reason,/demonstration/);
  assert.equal(record.artifacts.website.sections.length,6);
  assert.equal(record.artifacts.pitch.slides.length,6);
  assert.equal(record.duration_ms,events.at(-1)!.t_ms);
  assert.equal(record.duration_ms,events.at(-1)!.payload.duration_ms);
  assert.equal(exampleById(record.slug)?.record.id,record.id);
 }
 assert.equal(examples[0].record.artifacts.brand.core!.name,"Paw Palace");
 assert.equal(examples[0].record.artifacts.finance!.archetype,"capacity");
 assert.equal(examples[9].record.artifacts.finance!.monthlyPrice,4);
});

test("1x and 4x playback arrive at the same snapshots and use the stored timestamps",()=>{
 for(const {record,events} of examples){
  for(const speed of [1,4]){
   let state=emptyArtifacts();let consumed=0;
   for(let wall=0;wall<=record.duration_ms/speed+55;wall+=55){
    const visible=events.filter(e=>e.t_ms<=Math.min(record.duration_ms,wall*speed));
    state=reduceEvents(visible.slice(consumed),state);consumed=visible.length;
   }
   assert.equal(consumed,events.length);
   assert.deepEqual(state,record.artifacts,`${record.id} at ${speed}x`);
  }
  assert.deepEqual(reduceEvents([...events].reverse()),record.artifacts);
 }
});

test("downstream agents start after both inputs, before the final logo",()=>{
 for(const {record,events} of examples){
  const core=events.find(e=>e.type==="artifact.patch"&&e.payload.path==="core")!;
  const finance=events.find(e=>e.type==="artifact.patch"&&e.payload.path==="assumptions")!;
  const logo=events.find(e=>e.type==="artifact.patch"&&e.payload.path==="logo")!;
  for(const agent of ["Website","Pitch"]){
   const start=events.find(e=>e.agent===agent&&e.type==="agent.started")!;
   assert.ok(start.t_ms>core.t_ms&&start.t_ms>finance.t_ms&&start.t_ms<logo.t_ms,record.id);
  }
  assert.equal(reduceEvents(events.filter(e=>e.t_ms<core.t_ms)).brand.core,null);
  assert.equal(reduceEvents(events.filter(e=>e.t_ms<=finance.t_ms)).website.sections.length,0);
  events.forEach((event,i)=>{assert.equal(event.seq,i+1);assert.equal(event.build_id,record.id);if(i)assert.ok(event.t_ms>=events[i-1].t_ms);});
 }
});
