import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LiveStudio,ReplayStudio} from '../components/studio';
import {emptyArtifacts} from './reducer';
import {examples} from './fixtures';
import type {BuildEvent,BuildRecord} from './schema';
const record:BuildRecord={id:'test-replay',slug:'test-replay',prompt:'An illustrative community workshop',status:'failed',started_at:'2026-11-04T12:00:00Z',duration_ms:0,featured:false,schema_version:1,artifacts:emptyArtifacts()};
const event=(seq:number,agent:BuildEvent['agent'],type:BuildEvent['type'],payload:BuildEvent['payload']={}):BuildEvent=>({build_id:record.id,seq,t_ms:0,agent,type,payload});

test('expired replay shows stopped agents and no endless artifact spinners',()=>{
 const events=[event(1,'Brand','agent.started'),event(2,'Finance','agent.started'),event(3,'System','build.completed',{status:'failed'})];
 const html=renderToStaticMarkup(createElement(ReplayStudio,{record,events}));
 assert.equal((html.match(/Stopped before completion/g)||[]).length,2);
 assert.doesNotMatch(html,/agent-working|spinner-ring|Generating live|Designing symbol/);
 assert.match(html,/No artifact was completed/);
 assert.match(html,/This build finished with/);
 assert.match(html,/Copy replay link/);
 assert.doesNotMatch(html,/Open concept website/);
});
test('running saved build starts from saved events without replay or premature sharing controls',()=>{
 const events=[event(1,'Brand','agent.started')];
 const html=renderToStaticMarkup(createElement(LiveStudio,{prompt:record.prompt,existingBuildId:record.id,initialEvents:events,startedAt:record.started_at}));
 assert.match(html,/LIVE BUILD/);
 assert.match(html,/Brand agent engaged/);
 assert.doesNotMatch(html,/replay-controls|Copy replay link|Open concept website/);
});
test('finished replay can share and open its real website before playback reaches the end',()=>{
 const {record,events}=examples[0];
 const html=renderToStaticMarkup(createElement(ReplayStudio,{record,events}));
 assert.match(html,/Copy replay link/);
 assert.match(html,/Open concept website/);
 assert.match(html,/href="\/c\/demo-1"/);
 assert.doesNotMatch(html,/Ready to explore/);
});
test('corrupt replay visibly fails reconstruction instead of displaying successful empty artifacts',()=>{
 const events=[event(1,'Brand','artifact.patch',{artifact:'brand',path:'core',op:'set',value:{name:'Broken'}}),event(2,'System','build.completed',{status:'completed'})];
 const html=renderToStaticMarkup(createElement(ReplayStudio,{record:{...record,status:'completed'},events}));
 assert.match(html,/role="alert"/);
 assert.match(html,/Saved events are inconsistent/);
 assert.doesNotMatch(html,/Ready to explore|build-finale|spinner-ring/);
});
