import assert from "node:assert/strict";
import test from "node:test";
import {publicBuildMetadata} from "./site-metadata";
import {examples} from "./fixtures";
test("unlisted content never appears in social metadata",()=>{
 const record=structuredClone(examples[0].record);record.featured=false;record.prompt="Secret business prompt";record.artifacts.brand.core!.name="Secret Company";
 const metadata=publicBuildMetadata(record,"replay");const text=JSON.stringify(metadata);
 assert.ok(!text.includes("Secret"));assert.deepEqual(metadata.robots,{index:false,follow:false});assert.equal(metadata.alternates,undefined);
});
test("featured demo metadata links its own image and canonical page",()=>{
 const metadata=publicBuildMetadata(examples[0].record,"website");
 assert.equal(metadata.alternates?.canonical,"/c/demo-1");
 assert.match(metadata.description!,/Hand-authored fictional demo/);
 assert.match(JSON.stringify(metadata.openGraph),/\/api\/og\/demo-1/);
});
