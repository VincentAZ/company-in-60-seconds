# Company in 60 Seconds — Codex working instructions

You are the lead engineer implementing this project, not a spectator or plan writer. Continue from the existing code. Do not regenerate the project or replace working systems with scaffolds.

## Product
A person enters a one-sentence business idea. Five model stages (Brief -> [Brand, Finance] -> [Website, Pitch], with stage 2 unlocked after Brand core + Finance assumptions) emit real timestamped events. UI reveals four artifacts: brand, responsive website, editable 36-month finance model, linked pitch deck. Recorded event stream supports deterministic 1x/4x replay. Finished websites served at /c/[id] and replays at /b/[id]. Public gallery showcases hand-curated examples.

## Current verified state (November 4, 2026)
- Source already exists here. Next.js 16 / React 19 / TypeScript / Tailwind.
- npm run typecheck and npm run build succeeded.
- HTTP 200 verified for /, /b/demo-1, /c/demo-1, and /api/builds/demo-1 returned 31 events with Paw Palace brand.
- Homepage visually inspected with headless Chrome screenshot; good initial visual design.
- Four fixture examples, not twelve.
- Live Anthropic generation code in src/lib/agents.ts exists, but real API output has NOT been verified: ANTHROPIC_API_KEY is set in workstation shell, yet the first Claude CLI attempt reported insufficient API credit. Do not print secrets, do not assume runtime credits work. The user may have Claude subscription credits but those are distinct from API billing.
- Supabase client adapter exists in src/lib/storage.ts, with local development JSON fallback; no dedicated Supabase project or deployed schema set up yet.
- Git repository and Vercel app may still need initialization and connection.
- A local dev server may be running on localhost:3000. Don't kill unrelated services.
- The architecture-review response from Claude Code stressed resume after disconnect, structured schema validation, and production cost controls.

## Immediate priorities
1. Inspect the code and run typecheck / build / lint / tests. Fix real bugs, notably React Strict Mode double-mount in LiveStudio, streaming error handling, request aborts, and potentially the model JSONL parser.
2. Verify deterministic replay with a real reducer-vs-snapshot test, finance math test, and safety checks for geometric SVG renderer. Expand meaningful test coverage as needed.
3. Ensure AI calls use valid Anthropic SDK schema, valid model names, bounded tokens and retries, robust JSONL parsing, safe typed patches. If runtime API billing is unavailable, keep live generation disabled rather than faking it. The fixture examples must be labeled as demos.
4. Improve mission-control animations: Brand core -> real handoff pulse -> Website and Pitch; finance graph animation; logo shape draw; website sections slot and auto-scroll; pitch filmstrip finale. All triggered by real events.
5. Address critical public cost/security issues BEFORE enabling public generation. Current app server-side rate checks are NOT atomic/distributed. Create atomic reservation with database (e.g. transaction/stored procedure), daily cap, per-IP cap, concurrency cap, request idempotency and build cleanup. Keep secrets server-side, validate/limit user/model content, enforce RLS, and add moderation. Don't expose public controls prematurely.
6. Set up a dedicated Supabase project and migrations only with appropriate permissions/approved costs. Never repurpose unrelated existing projects. Persist build_events batches, recover dropped SSE streams by polling after seq, use sanitized public reads. Keep unlisted builds private from enumeration.
7. Deploy to a new Vercel project when ready, and smoke-test all routes. Keep unverified generation turned off until budget/rate controls are proven.
8. Expand gallery toward 12 distinctive example companies and ensure mobile view is excellent. Add share metadata / social cards.
9. Report accurately what works, what is fake/demo, and what remains. Favor working code and tests over prose. Do not ask unnecessary questions.

## Technical principles
- NO agent framework, arbitrary generated HTML/JS, per-company Vercel deployment, PowerPoint exports or Supabase Realtime.
- Only model-generated typed data consumed by React components; never execute AI-authored code.
- Semantic patches: artifact.patch {artifact,path,op,value}, event envelope {build_id,seq,t_ms,agent,type,payload}.
- Brand and Finance independent, downstream agents depend on outputs, not on final logo.
- Financial figures are deterministic and clearly illustrative; changing assumptions updates website pricing and deck metrics.
- Replay always uses stored timed events, not video. Every event and failure should be honest.
- Prefer TS/Zod compile-time and runtime validation. Fix accessibility and mobile behavior.
- Source is not a ready-to-deploy production service yet. Treat it as a working early prototype.

## Commands
npm install
npm run typecheck
npm run build
npm run dev

## Coordination
Claude was consulted as architecture reviewer; GPT-6 in ChatGPT authored initial code. Now continue implementation directly in Codex in this exact directory. User wants it done, not a plan. Clearly state results and links to local/remote working app when verified.
