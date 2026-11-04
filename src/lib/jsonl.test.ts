import {test} from "node:test";
import assert from "node:assert/strict";
import {JsonLinesParser,parseModelObject} from "./jsonl";

test("JSONL preserves quoted braces and escaped newlines across every chunk boundary",()=>{
 const values=[{path:"core",value:{text:'A } quote " and\nnewline ☀'}},{path:"logo",value:{shapes:[]}}];
 const text=values.map(v=>JSON.stringify(v)).join("\r\n");
 for(let boundary=1;boundary<text.length;boundary++){
  const output:unknown[]=[];const parser=new JsonLinesParser(v=>output.push(v));
  parser.push(text.slice(0,boundary));parser.push(text.slice(boundary));parser.finish();
  assert.deepEqual(output,values);
 }
});
test("invalid, truncated, fenced, or non-object model output fails visibly",()=>{
 for(const text of ['```json\n{}\n```','Here is your JSON\n{}','{}\n{"broken":','[{}]','null','']){
  assert.throws(()=>{const parser=new JsonLinesParser(()=>{});parser.push(text);parser.finish();});
 }
 assert.throws(()=>parseModelObject('prefix {"a":1} suffix'));
 assert.deepEqual(parseModelObject(' \n{"a":1} '),{a:1});
});
test("line, total-output and patch-count budgets reject overflow before accepting it",()=>{
 assert.throws(()=>new JsonLinesParser(()=>{},2,100,10).push('x'.repeat(11)));
 assert.throws(()=>new JsonLinesParser(()=>{},2,10,100).push('x'.repeat(11)));
 const values:unknown[]=[];const parser=new JsonLinesParser(v=>values.push(v),1);
 parser.push('{}\n');assert.throws(()=>parser.push('{}\n'));assert.equal(values.length,1);
});
