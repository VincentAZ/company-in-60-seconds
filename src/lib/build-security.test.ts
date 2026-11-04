import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildToken,hashToken,tokenMatches,validBuildId,generationEnabled} from './build-security';
test('unlisted access token cannot be guessed from a valid ID',()=>{
 process.env.BUILD_ACCESS_SECRET='test-only-secret-with-at-least-32-characters';
 const token=buildToken('test-id');
 assert.ok(tokenMatches(token,hashToken(token)));
 assert.equal(tokenMatches('wrong',hashToken(token)),false);
 assert.equal(tokenMatches(undefined,hashToken(token)),false);
 assert.equal(tokenMatches(token,'invalid'),false);
});
test('build IDs reject traversal and PostgREST filter injection',()=>{
 for(const id of ['../secret','foo,id.eq.demo-1','demo-1.json','demo-13','shortslug'])assert.equal(validBuildId(id),false);
 assert.ok(validBuildId('demo-12'));assert.ok(validBuildId('92b99c14-242b-431b-8cbe-99f86ed67c83'));
});
test('development also fails closed unless generation has been verified',()=>{
 const before=process.env.GENERATION_VERIFIED;delete process.env.GENERATION_VERIFIED;
 assert.equal(generationEnabled(),false);
 if(before)process.env.GENERATION_VERIFIED=before;
});
