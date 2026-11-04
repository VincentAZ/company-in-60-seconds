import {buildEventSchema} from "./schema";
import type {BuildEvent} from "./schema";

/** Bounded SSE framing; transport chunks can split UTF-8, lines, and delimiters. */
export class BuildStreamParser {
  private buffer = "";
  push(text: string): BuildEvent[] {
    this.buffer += text;
    const events: BuildEvent[] = [];
    let boundary: RegExpExecArray | null;
    while ((boundary = /\r?\n\r?\n/.exec(this.buffer))) {
      if (boundary.index > 65536) throw new Error("Build event exceeded the stream limit.");
      const frame = this.buffer.slice(0, boundary.index);
      this.buffer = this.buffer.slice(boundary.index + boundary[0].length);
      const event = this.parse(frame);
      if (event) events.push(event);
    }
    if (this.buffer.length > 65536) throw new Error("Build event exceeded the stream limit.");
    return events;
  }
  finish(): BuildEvent[] {
    const frame = this.buffer;
    this.buffer = "";
    const event = frame.trim() ? this.parse(frame) : null;
    return event ? [event] : [];
  }
  private parse(frame: string): BuildEvent | null {
    const lines = frame.split(/\r?\n/);
    const data = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
    if (!data) return null; // Heartbeats and SSE comments are not progress events.
    const value: unknown = JSON.parse(data);
    if (lines.some(line => /^event:\s*error\s*$/.test(line))) {
      const message = value && typeof value === "object" && "error" in value && typeof value.error === "string"
        ? value.error.slice(0, 300) : "The build stream reported an error.";
      throw new Error(message);
    }
    const parsed = buildEventSchema.safeParse(value);
    if (!parsed.success) throw new Error("The server returned an invalid build event.");
    return parsed.data as BuildEvent;
  }
}

export function mergeBuildEvents(existing: BuildEvent[], incoming: BuildEvent[]): BuildEvent[] {
  const bySequence = new Map(existing.map(event => [event.seq, event]));
  const buildId = existing[0]?.build_id ?? incoming[0]?.build_id;
  for (const event of incoming) {
    if (event.build_id !== buildId) throw new Error("The event stream changed build identifiers.");
    const previous = bySequence.get(event.seq);
    if (previous && !equivalentBuildEvent(previous, event)) throw new Error("Conflicting build events received.");
    bySequence.set(event.seq, event);
  }
  const merged = [...bySequence.values()].sort((a, b) => a.seq - b.seq);
  for (let i=1;i<merged.length;i++) {
    if (merged[i].t_ms < merged[i-1].t_ms) throw new Error("Build event time moved backwards.");
  }
  return merged;
}

// PostgreSQL jsonb changes object-key order. A recovered event must compare by
// content, while preserving array order (sections, points, and slides are ordered).
function equivalentJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value,index) => equivalentJson(value,right[index]));
  }
  const a=left as Record<string,unknown>,b=right as Record<string,unknown>;
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length && keys.every(key => Object.hasOwn(b,key) && equivalentJson(a[key],b[key]));
}

export function equivalentBuildEvent(left: BuildEvent, right: BuildEvent): boolean {
  return equivalentJson(left,right);
}

/** Never advance a recovery cursor past a missing event. */
export function eventCursor(events: BuildEvent[]): number {
  let cursor = 0;
  for (const event of events) {
    if (event.seq === cursor + 1) cursor = event.seq;
    else if (event.seq > cursor + 1) break;
  }
  return cursor;
}

/** Keep recovery alive through the database's ten-minute lease and cleanup grace. */
export function recoveryDeadline(startedAt: string, now=Date.now()): number {
  const started=Date.parse(startedAt);
  return Math.min(Number.isFinite(started)?started:now,now)+660000;
}
