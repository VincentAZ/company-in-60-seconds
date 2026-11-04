# Company in 60 Seconds

**One idea. Four AI builders. A company born before your eyes.**

An interactive AI-company-creation showcase. Describe a fictional business in one sentence and watch a brief agent coordinate a brand identity, editable financial model, responsive concept landing page, and pitch deck. Creation is streamed as timestamped, typed events that can be replayed and shared.

> **Status: work in progress.** The application compiles and the example gallery/replays work. Live Anthropic generation is implemented but has not yet been verified end-to-end. Supabase production persistence, distributed rate limits, and deployment are pending. Do not enable unrestricted public generation until the cost/security protections are complete.

## Features

- **Mission-control studio:** staged agent execution and a real event feed.
- **Actual dependencies:** Brief → Brand + Finance → Website + Pitch (stage 2 unlocks after brand core and financial assumptions become available).
- **Brand identity:** name, voice, palette, and validated geometric SVG symbol.
- **Live concept website:** generated from typed sections rendered with trusted React components; no model-authored HTML or JavaScript executes.
- **Financial modeling:** editable assumptions and deterministic 36-month projections; not investment advice.
- **Pitch deck:** slides reference finance model keys so metrics remain consistent.
- **Replay:** timestamped semantic patches, deterministic reduction, 1×/4× playback.
- **Gallery:** four illustrative, prerecorded example builds. No API key required to view them.
- **Demo websites:** each build can be explored at `/c/[id]`; replays are at `/b/[id]`.

## Run locally

Requires Node.js 22+.

```bash
npm ci
npm run dev
```

Open **http://localhost:3000**. Example: `http://localhost:3000/b/demo-1`.

To use live generation, create `.env.local` based on `.env.example` and configure `ANTHROPIC_API_KEY`. **The API account requires separate billing/credits; Claude web subscriptions do not necessarily fund API calls.**

```bash
npm run typecheck
npm run build
npm run lint
```

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Motion, Lucide, Zod, Anthropic SDK, and optional Supabase/Postgres.

## Architecture

```text
Business idea
     │
     ▼
Brief (validation + concept)
     │
     ├─────────────────┐
     ▼                 ▼
Brand core           Finance assumptions
     │                 │
     └────────┬────────┘
              │
     ┌────────┴─────────┐
     ▼                  ▼
Website sections     Pitch slides
     │                  │
     └────────┬─────────┘
              ▼
     Timed patch event log
              │
       ┌──────┴───────┐
       ▼              ▼
   Live studio     Shareable replay
```

Events follow `{build_id, seq, t_ms, agent, type, payload}`. The reducer in `src/lib/reducer.ts` applies typed semantic patches; `src/lib/fixtures.ts` supplies example events. The AI orchestration lives in `src/lib/agents.ts`, with storage in `src/lib/storage.ts`.

## Responsible deployment

- Never put model or Supabase service-role keys in client-side variables.
- Public AI generation defaults to **off in production** (`ENABLE_PUBLIC_BUILDS=false`).
- The existing rate checks are not yet atomic across serverless instances. Add database-enforced reservations, IP/day/global caps, and spending caps before enabling public runs.
- Configure a dedicated Supabase project and appropriate row-level security before release.
- Financial projections, market opportunities, brand names and concept websites are illustrative. The gallery uses prerecorded example event logs.
- Generated sites do not execute arbitrary AI-authored code. Contact forms are explicitly demo-only.

See **AGENTS.md** for the implementation handoff and next engineering tasks.

## License

No license has been selected yet. Publicly visible source is not automatically permission to reuse it.
