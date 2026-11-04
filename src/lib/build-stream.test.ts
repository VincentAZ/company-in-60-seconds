import assert from "node:assert/strict";
import test from "node:test";
import {BuildStreamParser,eventCursor,mergeBuildEvents} from "./build-stream";
import type {BuildEvent} from "./schema";
const event = (seq: number): BuildEvent => ({build_id:"test-build", seq, t_ms:seq * 100, agent:"System", type:"agent.status", payload:{message:"Ready ✦"}});

test("SSE handles every transport split, CRLF, comments and final frames", () => {
  const wire = ': heartbeat\r\n\r\ndata: ' + JSON.stringify(event(1)) + '\r\n\r\ndata:' + JSON.stringify(event(2));
  for (let split = 0; split <= wire.length; split++) {
    const parser = new BuildStreamParser();
    assert.deepEqual([...parser.push(wire.slice(0,split)), ...parser.push(wire.slice(split)), ...parser.finish()], [event(1),event(2)]);
  }
});
test("SSE errors and invalid event envelopes are surfaced", () => {
  assert.throws(() => new BuildStreamParser().push('event: error\ndata: {"error":"Persistence unavailable"}\n\n'), /Persistence unavailable/);
  assert.throws(() => new BuildStreamParser().push('data: {"seq":1}\n\n'), /invalid build event/);
  assert.throws(() => new BuildStreamParser().push('x'.repeat(65537)), /stream limit/);
});
test("recovery deduplicates and fills gaps without advancing the cursor prematurely", () => {
  const gap = mergeBuildEvents([event(1)], [event(3), event(1)]);
  assert.equal(eventCursor(gap), 1);
  const filled = mergeBuildEvents(gap, [event(2), event(3)]);
  assert.deepEqual(filled, [event(1),event(2),event(3)]);
  assert.equal(eventCursor(filled), 3);
  assert.throws(() => mergeBuildEvents(filled,[{...event(2),t_ms:999}]), /Conflicting/);
  assert.throws(() => mergeBuildEvents(filled,[{...event(4),build_id:"other"}]), /identifiers/);
});
