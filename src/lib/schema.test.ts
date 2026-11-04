import {test} from "node:test";
import assert from "node:assert/strict";
import {logoSchema,patchSchema,safeLogoPath,buildEventSchema} from "./schema";
import {applyPatch,emptyArtifacts,reduceEvents} from "./reducer";
import {examples} from "./fixtures";

test("geometric logo paths accept bounded SVG grammar and reject executable or malformed input",()=>{
 for(const path of ['M10 10 L90 10 L50 90 Z','m10,20 h20 v30 z','M5 5 C10 10 20 20 30 30','M10 10 A20 20 0 1 0 50 50','M1e1 10 l20 -5'])assert.equal(safeLogoPath(path),true,path);
 for(const path of ['M0 0 <script>','javascript:alert(1)','M0 0 L100000000 3','M0 0 LNaN 2','M0 0 L1e99 2','L5 5','M0 0 L2','M0 0 A20 20 0 2 0 50 50','M0 0 X1 2','M0 0 url(https://evil.test)','M0 0 Z1 2'])assert.equal(safeLogoPath(path),false,path);
 assert.equal(logoSchema.safeParse({shapes:[{kind:'image',href:'https://evil.test'}]}).success,false);
 assert.equal(logoSchema.safeParse({shapes:[{kind:'circle',cx:10,cy:10,r:5,fill:'url(#evil)'}]}).success,false);
 assert.equal(logoSchema.safeParse({shapes:Array(13).fill({kind:'circle',cx:10,cy:10,r:5,fill:'primary'})}).success,false);
});
test("patch schemas bind artifact, path, operation and value together",()=>{
 const core=examples[0].record.artifacts.brand.core!;
 assert.equal(patchSchema.safeParse({artifact:'finance',path:'core',op:'set',value:core}).success,false);
 assert.equal(patchSchema.safeParse({artifact:'brand',path:'core',op:'append',value:core}).success,false);
 assert.equal(patchSchema.safeParse({artifact:'brand',path:'__proto__',op:'set',value:core}).success,false);
 assert.equal(patchSchema.safeParse({artifact:'brand',path:'core',op:'set',value:{...core,palette:{...core.palette,ink:'red;display:none'}}}).success,false);
 const previous=emptyArtifacts();const next=applyPatch(previous,{artifact:'brand',path:'core',op:'set',value:core});
 assert.equal(previous.brand.core,null);assert.deepEqual(next.brand.core,core);
});
test("replay handles overlapping poll batches exactly once and rejects corrupted event identities",()=>{
 const sample=examples[0];
 assert.deepEqual(reduceEvents([...sample.events,...sample.events].reverse()),sample.record.artifacts);
 assert.throws(()=>reduceEvents([...sample.events,{...sample.events[0],payload:{changed:true}}]),/Conflicting/);
 assert.throws(()=>reduceEvents([...sample.events,{...sample.events[0],build_id:'different'}]),/different builds/);
 assert.throws(()=>reduceEvents(sample.events.map((e,i)=>i===2?{...e,t_ms:0}:e)),/backwards/);
 assert.equal(buildEventSchema.safeParse({...sample.events[0],seq:-1}).success,false);
});
test("repeated valid append patches cannot grow artifacts without bounds",()=>{
 const section=examples[0].record.artifacts.website.sections[0];let state=emptyArtifacts();
 for(let i=0;i<8;i++)state=applyPatch(state,{artifact:'website',path:'sections',op:'append',value:section});
 assert.throws(()=>applyPatch(state,{artifact:'website',path:'sections',op:'append',value:section}),/limit/);
});
