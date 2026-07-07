---
name: perf-optimize
description: Performance audit and optimization protocol for Vibey pages and features. Use this whenever the user says a page, panel, or feature is slow, laggy, heavy, "not optimized", takes long to load, fires too many API calls, refetches constantly, or asks to analyze/optimize/audit the performance of an area (spaces, brain, team, home, studio, funnels, settings, a modal, a chat panel...). Also trigger when the user mentions request waterfalls, N+1 queries, duplicate fetches, bundle size, slow space/page switching, or pastes dev-server logs full of repeated API calls, even if they do not say the word "performance".
---

# Performance Optimization Protocol

Two-phase contract: audit first, fix only after approval. The audit produces a
report the user can sanity-check; the fix phase applies the project's established
patterns. Do not jump straight to code changes because wrong assumptions about
what loads lead to optimizing the wrong thing.

This protocol was distilled from the Spaces page optimization (June 2026), which cut
a space switch from about 25 requests to about 4-6. The concrete fix patterns and the
worked case study live in [references/patterns.md](references/patterns.md) - read it
before the fix phase, and skim its "Anti-pattern checklist" during the audit.

## Phase 1 - Audit

Goal: know exactly what loads when the target area mounts, and why each request
fires. Trace code, do not guess.

### 1. Trace the mount path

Start from the route entry and walk down:

```text
app/(dashboard)/<area>/page.tsx -> entry/client components -> feature container(s)
-> hooks + zustand stores -> services (backendGet/fetch wrappers) -> backend module
```

- Read the container(s) fully. Note every `useEffect` that fetches, every store
  action called on mount, and every hook that fetches internally.
- For each fetch, record: endpoint, trigger (mount / dep change / event), and the
  file:line of the call site.
- Check the backend handler for the heaviest endpoints: `select('*')`? missing
  `limit`? filtering in app memory instead of SQL? per-row permission resolution?

### 2. Hunt the multipliers

A page that "fires too many calls" usually has a small set of fetches multiplied.
Check each of these explicitly because they stack:

- **Duplicate mounts**: the same component rendered twice (for example desktop +
  mobile trees both mounted, one hidden by CSS). Grep for the component name in its parent.
- **StrictMode**: dev runs every mount effect twice. Do not count these as real bugs,
  but do note that promise-dedupe makes them free.
- **Keyed remounts**: `key={someId}` on a heavy component replays its entire fetch
  waterfall on every id change.
- **Dependency churn**: `useCallback`/`useEffect` deps that change identity without
  changing meaning, such as `searchParams` objects, arrays rebuilt from store state,
  roster arriving async and re-triggering a batch that already ran.
- **N+1 loops**: one request per item in a list (per agent, per item, per member).
- **Per-mount static data**: models, skills, integrations, campaign lists - data
  that changes rarely but is refetched on every mount with no cache.

### 3. Check the waterfall and the bundle

- How many serial round-trips happen before content renders? What gates rendering
  (a `loading` flag that blocks the whole page on one fetch)?
- Are heavy subtrees (`modals`, editors like TipTap, rarely-used views) statically
  imported into the route chunk, or behind `next/dynamic`?

### 4. Separate dev noise from real cost

Before blaming the code: dev mode adds Next compile + proxy overhead (about
200-700ms per call here) and StrictMode doubling. Backend 502s/ECONNREFUSED in
pasted logs mean the API was down, not slow. Call these out in the report so
expectations are calibrated, but still fix the request count, which hurts in prod too.

## Phase 2 - Report

Present the findings in this structure:

```markdown
## TL;DR - what loads when <area> opens
**Network requests (in order):** bullet list - endpoint, source file:line, what
triggers it, and any multiplier (x2 dual mount, re-run on roster arrival, etc.)
**JavaScript:** what ships statically that should not.

## Why it feels slow
Numbered list of root causes, biggest first. Name the multipliers explicitly.

## Optimization plan (ranked by long-term UX value)
Numbered strategies. For each: what to do, which established pattern applies
(reference patterns.md by name), expected effect, and risk level.
```

Then stop and ask which items to implement. Recommend the highest-impact subset
(usually: kill the N+1/multipliers + cache-first rendering) rather than everything.

## Phase 3 - Fix (after approval)

Read [references/patterns.md](references/patterns.md) and apply the matching
patterns. The project already has the infrastructure, so reuse it instead of
inventing parallel caching systems:

- `apps/web/src/lib/cache/keyed-fetch-cache.ts` - `cachedFetch` (promise dedupe +
  TTL) for any repeated GET; `invalidateCachedFetch` on mutations.
- `apps/web/src/lib/cache/cached-resource.ts` - `createCachedResource` for
  singleton list resources with a `use()` hook.
- Snapshot/restore SWR caches inside zustand stores for per-entity switching
  (model: `itemsCacheBySpaceQuery` in `use-spaces-store.ts`).
- Batched endpoints instead of N+1 (model: comma-separated `agent_id` on
  `GET /api/conversations`).
- `useMediaQuery('(min-width: 768px)')` gating instead of CSS-hidden double mounts.
- `next/dynamic` for heavy views and modal hosts.

Constraints from the project protocol (`AGENTS.md` in the workspace instructions)
still apply: read whole files before editing, remove code you replace, log the
change in today's changelog (`.docs/logs/changelog[YYYY-MM-DD].md`), and use only
utility classes from `globals.css`.

## Phase 4 - Verify

- `npx tsc --noEmit -p apps/web/tsconfig.json` (and `apps/api` if touched)
- `npx eslint <touched files>` - note: `apps/web` features may not import other
  features; new shared code goes in `@/lib` (cross-feature imports fail lint unless
  the file is allowlisted).
- Run existing vitest files for touched stores/services.
- Never run full builds unless the user asks.
- Summarize before/after: expected request count per load/switch, what is now cached
  vs fresh, and any behavior trade-offs (TTL staleness windows, invalidation hooks).
