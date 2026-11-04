import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReplayStudio} from '../components/studio';
import {emptyArtifacts} from './reducer';
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
});
test('corrupt replay visibly fails reconstruction instead of displaying successful empty artifacts',()=>{
 const events=[event(1,'Brand','artifact.patch',{artifact:'brand',path:'core',op:'set',value:{name:'Broken'}}),event(2,'System','build.completed',{status:'completed'})];
 const html=renderToStaticMarkup(createElement(ReplayStudio,{record:{...record,status:'completed'},events}));
 assert.match(html,/role="alert"/);
 assert.match(html,/Saved events are inconsistent/);
 assert.doesNotMatch(html,/Ready to explore|build-finale|spinner-ring/);
});
