import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestOrigin,sameOrigin} from './request-origin';
test('same-origin requests use the browser Host even when the framework URL is internal',()=>{
 const req=new Request('http://localhost:3000/api/build',{headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'}});
 assert.equal(requestOrigin(req),'http://127.0.0.1:3100');assert.equal(sameOrigin(req),true);
});
test('cross-origin and forwarded-host spoofing remain rejected',()=>{
 for(const origin of ['https://evil.example','null','https://app.example.evil.example']){
  assert.equal(sameOrigin(new Request('https://localhost/api/build',{headers:{host:'app.example',origin,'x-forwarded-host':'evil.example'}})),false);
 }
 assert.equal(sameOrigin(new Request('https://localhost/api/build',{headers:{host:'app.example'}})),false);
 assert.equal(sameOrigin(new Request('https://localhost/api/build',{headers:{host:'evil.example/app.example',origin:'https://evil.example'}})),false);
});
