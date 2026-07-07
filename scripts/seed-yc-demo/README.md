# YC Demo Account Seeder — Foundry Creative

One-shot seeder that provisions a fully-populated demo org ("Foundry Creative", a fictional NYC brand+growth agency) in a Supabase project for YC partners to walk through.

The full design lives in `.cursor/plans/yc_demo_account_seed_*.plan.md`. This README is the operator manual.

## What it provisions

- **3 humans**: Founder (Garry Tan display name) + Nico (Head of Strategy) + Jules (Head of Delivery)
- **7 named AI agent hires** (Maya, Leo, Sara, Devon, Riley, Casey, Owen) + 3 system agents (Vibey, Jaime, Atlas)
- **5 brains** populated to "lived in for 90 days" depth: user, company (cortex objects + signals + dream runs), customer (clusters + avatars), 5 deep agent brains, 9 campaign brains
- **9 campaigns**: 6 fictional clients + Internal Ops + Sales/Pipeline + Company Wiki
- **Spaces with hand-authored schemas** (views: missions / kanban / docs / channel / calendar / list)
- **~30 missions** + subtasks + deliverables along the 90-day timeline
- **~360 artifacts** (offers / funnels / sequences / emails / presentations / websites / media_assets / ad_campaigns / ads / forms / marketing avatars) — Adley templates from prod, reskinned per fictional client
- **Channels with 90 days of messages** referencing artifacts and avatars
- **50,000 credits** + integrations façade
- **Verified connectivity**: 19 invariants asserted at the end so no row is orphan

## Required env

When vars are not exported in the shell, the seeder auto-loads `apps/api/.env` (and `apps/agent-api/.env`), mapping `API_BASE_URL` from `AGENT_API_URL` when needed.

```bash
export SUPABASE_URL=https://qfrvykscoymiwwgysvsr.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...           # service role, never anon
export API_BASE_URL=https://api.vibey.im
export INTERNAL_API_TOKEN=...                  # InternalAuthGuard token
export OPENAI_API_KEY=...                      # for embeddings (text-embedding-3-small)
export EXPECTED_SUPABASE_HOST=qfrvykscoymiwwgysvsr.supabase.co   # optional safety
```

Or rely on `apps/api/.env` when running locally.

## Usage

```bash
# show all phases without running anything
pnpm seed:yc-demo --list

# dry-run end-to-end (no commits)
pnpm seed:yc-demo --dry-run

# real run — provisions the demo account
pnpm seed:yc-demo

# run a single phase (e.g. while iterating)
pnpm seed:yc-demo --phase=05-campaigns

# reskin 6 curated Adley templates into demo clients (no full re-seed)
pnpm seed:yc-demo --phase=07_5d-curated-showcase

# tear down the demo org first, then re-seed clean
pnpm seed:yc-demo --reset

# include the optional Atlas freshness pass (requires mission-worker reachable)
pnpm seed:yc-demo --enable-atlas-fresh
```

At the end of a successful run you get:

```
============================================================
YC DEMO ACCOUNT — Foundry Creative
============================================================
Login URL: https://app.vibey.im/login
Email:     yc-demo@vibey.im
Password:  <16-char human-readable>
Org:       Foundry Creative
Credits:   50,000
============================================================
```

Same content written to `apps/api/.docs/yc-demo-credentials.md` (gitignored).

## Safety guarantees

- **Service role only**. Anon key is never used.
- **EXPECTED_SUPABASE_HOST** assertion refuses to run if the URL host doesn't match.
- **Deterministic UUIDs** via `lib/ids.ts` — re-runs are idempotent; `--reset` knows every id it ever created.
- **READ-ONLY against prod** for the Adley template extraction (Phase 7.5a). P12 explicitly asserts no `updated_at` change in prod.
- **No fallback mechanisms** — every error throws with full context. The seeder fails loudly if anything is wrong.

## File layout

```
scripts/seed-yc-demo/
├── index.ts                # CLI entry
├── tsconfig.json           # extends tsconfig.base.json
├── lib/                    # env, supabase, api, ids, log, timeline helpers
├── content/                # hand-authored data (typed)
│   ├── timeline.ts         # the locked 13-week story arc
│   ├── _types.ts           # shared content types
│   └── ...
└── phases/                 # numbered handlers, run in registry order
    ├── _registry.ts
    ├── _context.ts
    └── ...
```

## Phase execution order

See `phases/_registry.ts` for the canonical list. Notable ordering:

1. `01..07` provision base structure (humans, brains skeleton, anchors, team, campaigns, spaces, missions)
2. `03b1` builds `customer_avatars` from contact clusters — must run before `07.5c`
3. `07.5a-d` cloneAdley templates, reskin per client, derive marketing avatars; `07.5d` optional curated showcase pass
4. `08` seeds channels with messages that reference artifacts
5. `03b2` runs cortex dream/signals/objects — must run after `08` so signals can cite real message IDs
6. `09-10` integrations + polish
7. `11` optional Atlas freshness
8. `12` verify + print credentials
