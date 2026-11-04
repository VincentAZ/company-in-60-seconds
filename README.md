# Company in 60 Seconds

One idea becomes a brand, concept website, editable 36-month finance model and linked pitch deck. Five direct model stages emit timestamped, typed events: Brief → [Brand, Finance] → [Website, Pitch]. Downstream work starts when brand core and financial assumptions arrive, before the logo finishes.

**Release status (November 4, 2026):** the twelve fictional demo companies work without API credentials. Generation is deliberately disabled. One authorized real Anthropic run failed at Brief with an API billing error; authentication and configured model availability passed. A dedicated Supabase project could not be created because the account already has two active free projects. Existing projects were left untouched. The database migration and admission controls pass local PostgreSQL checks; hosted persistence is not verified.

## Run and verify

Node.js 22+:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Open http://localhost:3000. Demo replay: `/b/demo-1`; concept website: `/c/demo-1`. The gallery contains twelve hand-authored examples, not outputs from verified live generation. All financials, businesses and market assumptions are illustrative.

Tests cover independent fixture snapshots vs event reduction, recorded-time 1×/4× replay, finance reconciliation and startup recovery, safe SVG paths, typed patches, model JSONL and SSE boundaries, orchestration dependencies, failure/cancellation, durable terminal commits, request serialization through the actual Anthropic SDK with mocked HTTP, database budgets/idempotency, cleanup, and denied anonymous access.

## Experience

- Brand core + finance assumptions trigger the recorded handoff pulse.
- Logo shapes draw, financial graphs reveal, website sections arrive and scroll, and the pitch filmstrip assembles as their artifact events arrive.
- Replay pause, scrub, restart and 1×/4× controls use the stored event timestamps.
- Editing finance assumptions updates website pricing and linked deck metrics in the same studio. Edits are a local exploration and do not rewrite recorded history.
- The full 36-month model exposes revenue, costs and profit. Break-even includes startup costs; operating profit excludes them. Marketplace unit price is net platform revenue per transaction. Growth applies before churn, and capacity is assumed expandable.
- Company pages use trusted React templates. Generated HTML, JavaScript and arbitrary SVG markup are never executed. Demo forms do not transmit data.
- Public demos have branded social cards. Unlisted builds require an HttpOnly capability cookie; explicit sharing creates a token link, exchanges it for a cookie, then redirects to a clean replay URL. A shared token grants access to anyone holding it. Private metadata remains generic and noindex.

## Generation and cost controls

Copy `.env.example` to `.env.local` and configure server-side values only. **Do not enable generation merely because a key is present.** Both `ENABLE_PUBLIC_BUILDS=true` and `GENERATION_VERIFIED=true`, valid independent secrets, configured persistence, and an enabled database budget are required. The default database budget is zero, with admission disabled. Development also fails closed.

The only permitted model IDs are `claude-haiku-4-5-20251001` and `claude-sonnet-4-6`. Requests have a 16KB input bound, 1,600/4,800 output-token bounds, an overall 240-second deadline, and at most one retry per stage for transient provider failures before publishing any patch. API credits are separate from a Claude subscription. No public model endpoints or browser keys are used.

A server-only `reserve_build` transaction locks the singleton limits row before admitting work. It enforces UTC daily, per-IP, concurrent and reserved-dollar caps across processes. Failures count against the budget. The default conservative reservation is $5 per build; an administrator must explicitly configure an approved daily budget. Only trusted Vercel forwarding headers identify public request IPs; raw IPs are HMAC-hashed with a secret salt. Non-Vercel development uses a shared loopback bucket.

UUID request keys prevent duplicate paid builds on Strict Mode mounts, refreshes, and retried responses. Requests reject cross-origin posts, malformed IDs and oversized bodies. The Brief model moderates the idea before downstream stages; all outputs are treated as untrusted data. This is basic model moderation, not a claim of comprehensive abuse prevention.

Events persist in serialized batches during execution. Browser disconnects do not cancel server work, and a Next.js `after` hook holds the running promise. Polling resumes after the last contiguous sequence. A transactional `finish_build` saves the final snapshot and terminal event together before success is sent to the browser. Abandoned builds expire after ten minutes during admission or authorized reads. This recovers saved events, not interrupted model computation after a server crash.

## Dedicated Supabase setup

Apply `supabase/migrations/20261104214302_build_reservations.sql` to a **new dedicated project** after its organization and cost are approved. It creates `build_limits`, `builds`, `build_events`, and three server-only RPCs. RLS is enabled; `anon` and `authenticated` have no table or RPC grants. Sanitized reads flow through Next.js, never direct browser database access. Only explicitly featured records appear in the gallery. Runtime service credentials must remain server-side.

Hosted setup remains pending the free-project quota decision. Do not repurpose, pause or delete unrelated projects to bypass this limit. Before public enablement, verify hosted grants/advisors, concurrent reservations, cookie-protected reads and sharing, event persistence during disconnect, cleanup, a real complete model run, and an approved database budget.

Unit database checks use PGlite. To reproduce real multi-session contention with Docker, create an isolated local PostgreSQL container, create `anon`, `authenticated`, and `service_role` (BYPASSRLS) roles, and apply the migration. Then run:

```bash
python3 scripts/check-reservation-concurrency.py company60-postgres-check
```

The script only accepts an explicitly named test container and resets its application tables. The verified run admitted exactly 2 of 12 concurrent requests, and 12 identical retries produced one reservation/build.

## Explicit paid verification

`scripts/verify-live.ts` is deliberately excluded from tests and CI. It makes real model calls only with an explicit flag:

```bash
npx tsx scripts/verify-live.ts --confirm-paid-run
```

Run it only with an approved API spend budget. It writes private local evidence under ignored `.local-data`, checks recorded replay against the final snapshot and categorizes provider failures without printing credentials. A failed verification must not unlock public generation.

## Deployment

The dedicated Vercel project is `company-in-60-seconds` in `serpicoai`. Both generation flags remain false; no model or database credentials are required to deploy the demo gallery. GitHub source: https://github.com/VincentAZ/company-in-60-seconds. Set `SITE_URL` to the deployment's canonical origin if needed for metadata.

The app has no per-company deployment, agent framework, Supabase Realtime dependency or PowerPoint export. All companies are served from `/c/[id]` and `/b/[id]` in one app.

## License

No license has been selected. Public source visibility does not itself grant reuse permission.
