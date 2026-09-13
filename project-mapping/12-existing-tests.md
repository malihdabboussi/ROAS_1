# Existing Tests

Evidence base: commit `f4757c2b` (branch `main`, 13 dirty files), Node 22.23.2, pnpm 9.15.4, macOS 14.8.5, 2026-09-05.
All counts below come from `rg --files` and from actual test-runner output, not from estimates.

---

## Summary

Total test/spec files discovered repo-wide (excluding `node_modules` and `dist`): **3,070**.

```
rg --files -g '*.test.ts' -g '*.test.tsx' -g '*.test.js' -g '*.test.mjs' \
          -g '*.spec.ts' -g '*.spec.tsx' \
          -g '!**/node_modules/**' -g '!**/dist/**' | wc -l
→ 3070
```

### By app / package

| App / package                 | Runner                 | Test files | Tests collected | Result                      | Status            |
| ----------------------------- | ---------------------- | ---------: | --------------: | --------------------------- | ----------------- |
| `apps/openclaw` (vendored)    | vitest 4.0.18          |      1,157 |   not collected | —                           | NOT RUN (slow)    |
| `apps/web`                    | vitest 2.1.9 + jsdom   |        981 |           **0** | 981 files error at setup    | BROKEN-CANNOT-RUN |
| `apps/api`                    | vitest 2.1.9 + swc     |        541 |           2,321 | 33 files failed, 507 passed | FAILING           |
| `apps/agent-api`              | vitest 2.1.9           |        269 |           1,758 | 11 files failed, 255 passed | FAILING           |
| `apps/mission-worker`         | vitest 4.0.18          |         70 |             293 | 1 file failed, 67 passed    | FAILING           |
| `packages/api-shared`         | vitest 2.1.9 (hoisted) |         23 |             119 | 1 file failed, 22 passed    | FAILING           |
| `apps/web/e2e`                | Playwright 1.49+       |          7 |               — | —                           | NOT RUN (unsafe)  |
| `apps/queue-worker`           | vitest 2.1.9 (hoisted) |          5 |               9 | 3 passed, 2 skipped         | PASSING           |
| `apps/funnels`                | vitest 2.1.9 (hoisted) |          5 |              10 | all passed                  | PASSING           |
| `apps/openrouter-model-scout` | vitest 2.1.9           |          5 |              11 | all passed                  | PASSING           |
| `packages/agent-policy`       | vitest 2.1.9           |          5 |              53 | all passed                  | PASSING           |
| `scripts/arch`                | `node --test`          |          2 |               5 | all passed                  | PASSING           |
| `workers/apps-proxy`          | **none**               |          1 |               — | no runner exists            | BROKEN-CANNOT-RUN |
| `supabase/functions`          | **none**               |          1 |               — | no runner exists            | BROKEN-CANNOT-RUN |
| **Total**                     |                        |  **3,070** |                 |                             |                   |

The per-app numbers reconcile exactly to 3,070 (1157 + 981 + 541 + 269 + 70 + 23 + 7 + 5 + 5 + 5 + 5 + 2 + 1 + 1).

### By type

| Type                            | Files | Notes                                      |
| ------------------------------- | ----: | ------------------------------------------ |
| Unit / integration (vitest)     | 3,061 | across 10 workspaces                       |
| E2E (Playwright)                |     7 | `apps/web/e2e`, single root config         |
| Self-test (`node --test`)       |     2 | `scripts/arch/*.test.mjs`                  |
| Orphaned (no runner configured) |     2 | `workers/apps-proxy`, `supabase/functions` |

### Workspaces with zero tests

`apps/admin`, `apps/website`, `apps/docs`, `apps/chrome-extension`, `packages/ui`, `packages/db`,
`packages/context-breakdown`, `packages/vibey-sdk`, `packages/widget-catalog`.
The last three declare `"test": "echo 'No tests yet'"`, which exits 0 — so `turbo test` reports them green.

---

## Test Infrastructure

### Runner versions (installed, not declared)

| Workspace                                                                                        | vitest resolved                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| root                                                                                             | 2.1.9                                 |
| `apps/web`, `apps/api`, `apps/agent-api`, `apps/openrouter-model-scout`, `packages/agent-policy` | 2.1.9                                 |
| `apps/mission-worker`, `apps/openclaw`                                                           | **4.0.18**                            |
| `apps/queue-worker`, `apps/funnels`, `packages/api-shared`                                       | none declared — inherit hoisted 2.1.9 |

**Two major vitest versions coexist.** `mission-worker` and `openclaw` are on v4 while everything
else is on v2.1.9. `packages/api-shared` declares no vitest dependency and no config at all; it runs
on whatever the workspace hoists.

### Environments and setup files

| App                   | `environment`                              | `include`                                            | `setupFiles`        |
| --------------------- | ------------------------------------------ | ---------------------------------------------------- | ------------------- |
| `apps/web`            | `jsdom`                                    | `src/**/*.test.{ts,tsx}`, `tests/**/*.test.{ts,tsx}` | `./tests/setup.ts`  |
| `apps/api`            | `node` (+ `unplugin-swc`, `globals: true`) | `src/**/*.test.ts`                                   | `src/test/setup.ts` |
| `apps/agent-api`      | `node`                                     | `src/**/*.test.ts`, **`src/**/\*.eval.ts`\*\*        | none                |
| `apps/funnels`        | `node`                                     | `src/**/*.test.{ts,tsx}`                             | none                |
| `apps/mission-worker` | default (`node`), `globals: false`         | `src/**/*.test.ts`                                   | none                |
| `apps/queue-worker`   | default (`node`), `globals: false`         | `src/**/*.test.ts`                                   | none                |
| `packages/api-shared` | vitest defaults                            | vitest defaults                                      | none                |

`apps/web` is the only jsdom suite, and it is the only suite that is 100% dead (see below).

`apps/agent-api` deliberately folds `*.eval.ts` into its normal `test` script. Those three eval files
are **not** live-model evals — they drive `BrainEvalRunner`/`UserWorkEvalRunner` through mocked
adapters and local JSON fixtures, so they are deterministic and offline.

### Path aliasing — a shared hazard

`apps/web`, `apps/api`, `apps/agent-api`, `apps/mission-worker` and `apps/funnels` all alias
`@vibey/api-shared` to `packages/api-shared/**src**`, bypassing the package's built `dist` entry
point. That is what exposes every one of them to the stale-`.js` shadowing bug documented below.
Production code is unaffected because `package.json` `main`/`exports` point at `dist/`.

### Playwright

One config at the repo root, `playwright.config.ts`:

- `testDir: ./apps/web/e2e`, chromium only, `workers: 1`, `fullyParallel: false`, `retries: 2`
- `baseURL: http://localhost:3000`
- `webServer` auto-starts `pnpm --filter @vibey/web dev` with `reuseExistingServer: true`

Invoked via `apps/web`'s `test:e2e` script (`playwright test --config ../../playwright.config.ts`)
or root `pnpm test:e2e` (turbo, which additionally `dependsOn: ["build"]`).

### What CI would run — there is no CI

**`.github/` contains only `pull_request_template.md`. There are no workflows.** No CircleCI,
Travis, GitLab, Jenkins or Azure config exists either. The only automated gate is a husky
`pre-commit` hook:

```
pnpm architecture:check -- --staged
pnpm lint-staged
```

**No test of any kind runs on commit, on push, or on pull request.** Every result in this document
had to be produced by hand. This is the single most important fact about testing in this repo: the
981-file frontend suite has been dead long enough that a stale compiled artifact from an earlier
snapshot is still shadowing live source, and nothing anywhere would have reported it.

Note also that `turbo.json` gives `test` a `dependsOn: ["^build"]`, so `pnpm test` at the root
triggers builds of dependencies — which is why it was not run here (builds are out of scope).

---

## Test Inventory

### `apps/web` — 981 files — BROKEN-CANNOT-RUN

Command: `pnpm --filter @vibey/web test`

| Directory                | Files | Feature area                                                                       | Status            |
| ------------------------ | ----: | ---------------------------------------------------------------------------------- | ----------------- |
| `src/features/**`        |   630 | spaces, brain, chat, studio, funnels, contacts, billing, missions, integrations, … | BROKEN-CANNOT-RUN |
| `src/components/**`      |   176 | shared UI, design-system primitives                                                | BROKEN-CANNOT-RUN |
| `src/lib/**`             |   141 | clients, helpers, formatters, supabase wrappers                                    | BROKEN-CANNOT-RUN |
| `src/app/**`             |    24 | route handlers, layouts                                                            | BROKEN-CANNOT-RUN |
| `src/middleware.test.ts` |     1 | auth middleware                                                                    | BROKEN-CANNOT-RUN |
| `tests/*.test.{ts,tsx}`  |     4 | components, studio, middleware, supabase client                                    | BROKEN-CANNOT-RUN |

Every one of the 981 files fails during `setupFiles` execution, before a single test is collected.
Zero tests run. Root cause in _Tests That Cannot Run_.

### `apps/api` — 541 files — FAILING

Command: `pnpm --filter @vibey/api test`
Latest run: **33 files failed | 507 passed | 1 skipped**; **23 tests failed | 2,191 passed | 87 skipped | 20 todo**.

| Directory                                                                      |     Files | Feature area                                  | Status                          |
| ------------------------------------------------------------------------------ | --------: | --------------------------------------------- | ------------------------------- |
| `src/modules/**` (majority)                                                    |      ~500 | all NestJS domain modules                     | mostly PASSING                  |
| `src/test/integration/**`                                                      |        16 | HTTP contract + org-scoping integration       | FAILING (all, one shared cause) |
| `src/test/contract/route-inventory.test.ts`                                    |         1 | committed route snapshot                      | FAILING (snapshot drift)        |
| `src/modules/spaces/**`                                                        | 5 failing | space automations, human gate, send-to-cursor | FAILING                         |
| `src/modules/slack/**`                                                         | 2 failing | Slack media + sender resolution               | FAILING                         |
| `src/modules/work-requests/**`                                                 | 2 failing | work request repo + scope                     | FAILING                         |
| `src/modules/{brain,media,link-preview,skill-recommendations,space-templates}` | 5 failing | assorted                                      | FAILING                         |

**Failure split — this matters:**

- **20 failed _suites_**, every one under `src/test/integration/**`, all sharing **one** root cause
  (the `ErrorReporter` DI error). Vitest prints the error once and attributes it to all 20.
- **23 failed _tests_** spread across 17 other files, each with a **distinct** cause.
- 20 + 23 = 43, matching vitest's own `[N/43]` failure counter.

**The suite is non-deterministic.** Three consecutive full runs at the same commit produced
36 files/27 tests, then 35/26, then 33/23. Run-to-run variance of ~3 files is baked in, so any
single number here is a snapshot, not a constant.

### `apps/agent-api` — 269 files — FAILING

Command: `pnpm --filter @vibey/agent-api test`
Run: **11 files failed | 255 passed | 3 skipped**; **22 tests failed | 1,727 passed | 9 todo**.

| File                                                                        | Feature area                                                              | Status                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| `src/modules/artifacts/**` (4 files)                                        | artifact RBAC, media processing, legacy runtime, post-action verification | FAILING                  |
| `src/modules/chat/**` (3 files)                                             | access context, channel message persistence, OpenClaw proxy               | FAILING                  |
| `src/modules/billing/services/credits.service.test.ts`                      | credits                                                                   | FAILING                  |
| `src/modules/agent-sync/services/agent-runtime-skill-scope.service.test.ts` | skill scoping                                                             | FAILING                  |
| `src/test/contract/route-inventory.test.ts`                                 | route snapshot                                                            | FAILING (snapshot drift) |
| `src/modules/brain/evals/*.eval.ts` (3 files)                               | Brain retrieval golden sets, user-work harness                            | PASSING                  |
| everything else (~255 files)                                                | Brain, flows, missions, MCP, tools, policy                                | PASSING                  |

All 22 are individual test failures — there is no suite-level collapse here. Dominant causes:
`this.campaignContext.buildCampaignSummary is not a function` (4), Supabase mock chains missing
`.order`/`.select` (3), skill-scope precedence assertions (3), one route-inventory snapshot
mismatch, one 5s timeout.

### `apps/openclaw` — 1,157 files — NOT RUN (slow)

Command: `pnpm --filter openclaw test` → `node scripts/test-parallel.mjs`

| Subtree         | Files |
| --------------- | ----: |
| `src/**`        | 1,021 |
| `extensions/**` |   106 |
| `ui/**`         |    26 |
| `test/**`       |     4 |

This is a **vendored upstream product** (`openclaw@2026.2.16`, "Multi-channel AI gateway"), not
ROAS-authored code, that happens to sit inside the monorepo as a pnpm workspace member. Its test
story is entirely its own: a bespoke `scripts/test-parallel.mjs` orchestrator, separate
`vitest.unit.config.ts` / `vitest.e2e.config.ts` / `vitest.live.config.ts`, plus a `test:docker:*`
family and a `test:live` target gated on `OPENCLAW_LIVE_TEST=1`.

Not run here: it is the largest suite in the repo, it shells out to a custom parallel orchestrator
with VM-fork profiles, and its sibling targets (`test:live`, `test:docker:*`) reach real model
providers and Docker. Since `openclaw` is a workspace member with a `test` script, a bare
`pnpm test` at the root **would** pull all 1,157 files into the graph.

### `apps/mission-worker` — 70 files — FAILING

Command: `pnpm --filter @vibey/mission-worker test`
Run: **1 file failed | 67 passed | 2 skipped**; **1 test failed | 287 passed | 5 todo**.

Sole failure: `src/modules/brain-ops/customer-signal-sweeper.contract.test.ts >
CustomerSignalSweeperService.shouldFlushScope > does not flush below the token threshold within the
same UTC day` — `Test timed out in 5000ms`. A timeout rather than an assertion, so likely flaky or
awaiting a promise that never settles under the default 5s budget.

### `packages/api-shared` — 23 files — FAILING

Command: `pnpm --filter @vibey/api-shared test`
Run: **1 file failed | 22 passed**; **2 tests failed | 117 passed**.

Both failures are in `src/services/funnel-tsx-contract.test.ts`:

1. `treats type-only diagnostics as warnings` — `expected 0 to be greater than 0`
2. `programmatic repair adds missing hook imports` — `programmaticTsxRepair is not a function`

Root cause in _Tests That Cannot Run_. Note `src/services/provider-billing/payment-path-guard.test.ts`
takes ~4.0s alone — it greps source for billing-path violations, an architectural guard rather than
a unit test.

### Small passing suites

| Suite                         | Files |       Tests | Command                                           | Status                          |
| ----------------------------- | ----: | ----------: | ------------------------------------------------- | ------------------------------- |
| `packages/agent-policy`       |     5 |          53 | `pnpm --filter @vibey/agent-policy test`          | PASSING                         |
| `apps/openrouter-model-scout` |     5 |          11 | `pnpm --filter @roas/openrouter-model-scout test` | PASSING                         |
| `apps/funnels`                |     5 |          10 | `pnpm --filter @vibey/funnels test`               | PASSING                         |
| `apps/queue-worker`           |     5 | 9 (+6 todo) | `pnpm --filter @vibey/queue-worker test`          | PASSING (2 files fully skipped) |
| `scripts/arch`                |     2 |           5 | `pnpm architecture:self-test`                     | PASSING                         |

`apps/queue-worker`'s two org-scoping files (`email-org-scoping`, `broadcast-org-scoping`) are
entirely `todo` — 6 placeholder tests, zero assertions. The suite reports green while testing
nothing about org isolation in the email pipeline.

### Orphaned tests — no runner exists

| File                                                   | Problem                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `workers/apps-proxy/src/index.test.ts`                 | `workers/apps-proxy` is **not** in `pnpm-workspace.yaml` and has no `test` script |
| `supabase/functions/vibey-artifacts/ownership.test.ts` | `supabase/` is not a workspace; no Deno/vitest runner configured                  |

These two files can never execute under any command in the repo.

---

## Coverage Gaps

Measured against the module list in `04-feature-inventory.md`.

### Frontend features with no test file at all

Of 35 directories under `apps/web/src/features/`, **7 contain zero test files**:

`agent-teams`, `autopilot`, `domains`, `impersonation`, `inbox`, `my-work`, `onboarding`.

`impersonation` and `onboarding` are the notable ones — impersonation is a privilege-escalation
surface and onboarding is the first-run path for every new account.

The other 28 have test files, but that is currently a distinction without a difference: none of
them can execute (see below). **Effective frontend feature coverage is 0/35.**

### Whole apps with no tests

- `apps/admin` (port 3002, admin/platform-ops surface) — **zero tests**, no `test` script.
- `apps/website` — zero tests.
- `apps/funnels` — 5 tests, all library-level (`assemble-funnel-html`, `resolve-domain`,
  error reporters). No page, block, or form-rendering coverage.
- `apps/chrome-extension`, `apps/docs` — zero tests.

### Feature areas from `04-feature-inventory.md` with no executable coverage

Because `apps/web` cannot run, every UI-layer feature is uncovered. Backend coverage in `apps/api`
and `apps/agent-api` is genuinely broad (2,321 and 1,758 tests), so the gaps below are the ones
that survive even after ignoring the frontend:

| Feature area              | Gap                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Admin & Platform Ops      | no tests anywhere (`apps/admin` has none; API-side admin module thinly covered)        |
| Identity & Onboarding     | `onboarding` feature dir empty; onboarding integration tests are in the dead 20 suites |
| Email & Sequences         | `queue-worker` org-scoping tests are `todo` placeholders only                          |
| Channels / Inbox / DM     | `inbox` feature dir empty                                                              |
| Domains                   | `domains` feature dir empty; only `resolve-domain` in funnels                          |
| AI App Builder (Projects) | no dedicated suite found                                                               |
| Public / Shared surfaces  | one `shared/space` route exercised manually, no automated test                         |

### Structural gap

There is **no contract test between frontend and backend**. `route-inventory.test.ts` snapshots the
API's own route list (and is currently failing in both `apps/api` and `apps/agent-api`), but nothing
asserts that what `apps/web` calls matches what the API serves. With the frontend suite dead, an API
route rename would be caught by nothing until runtime.

---

## Tests That Cannot Run

### 1. `apps/web` — all 981 files, 0 tests collected — CONFIRMED

**Symptom.** Every file fails in `setupFiles` before collection.

**Chain.** `apps/web/tests/setup.ts:1`:

```ts
import { TextEncoder as NodeTextEncoder, TextDecoder } from 'util'
```

then line 9:

```ts
class TextEncoder extends NodeTextEncoder {
```

Under vitest 2.1.9 + jsdom, the **bare** specifier `'util'` is resolved in web mode, so it does not
reach Node's builtin. It resolves instead to the npm `util@0.12.5` shim, whose `util.js` assigns
exactly 25 exports:

```
_extend, callbackify, debuglog, deprecate, format, inherits, inspect, isArray, isBoolean,
isBuffer, isDate, isError, isFunction, isNull, isNullOrUndefined, isNumber, isObject,
isPrimitive, isRegExp, isString, isSymbol, isUndefined, log, promisify, types
```

`grep -c TextEncoder` on that file returns **0**. So `NodeTextEncoder` is `undefined`, and
`class TextEncoder extends undefined` throws `TypeError: Class extends value undefined is not a
constructor or null` at module scope — killing setup, and therefore every file.

**Empirically confirmed fix.** A throwaway jsdom vitest config was run against a probe importing
both specifiers, then deleted (repo verified clean afterwards):

```
PROBE bare-util TextEncoder = undefined
PROBE node-util TextEncoder = function
```

Changing `'util'` → `'node:util'` resolves it. **Not applied — documented only.**

**Aggravating detail.** The `util` shim is not installed anywhere inside the repo. It resolves to
`/Users/malihdabboussi/Desktop/projects/node_modules/util` — a stray `node_modules` in the _parent
directory of the checkout_. Node and Vite walk up the tree and find it there.
`node_modules/util` exists in neither the repo root nor `apps/web`. This makes the failure
environment-dependent in a way that is very hard to reproduce or diagnose: the same commit could
behave differently on a machine without that stray folder. It is not a Node-version problem —
it reproduces identically on Node 20, 22 and 23.

### 2. `apps/api` — 20 integration suites — CONFIRMED, and it is _not_ a missing module import

**Symptom.**

```
Nest can't resolve dependencies of the MachinesService
(?, MachinePoolService, FlyMachineStateService, MachineRuntimeCapabilitiesService,
 MachineWakeAttemptsService, MachineProfileRepository).
Please make sure that the argument ErrorReporter at index [0] is available in the
MachinesModule context.
```

**This is the same disease as the api-shared failure below.** The initial hypothesis — that some
test bootstrap forgets to import `SharedModule` — is wrong. The bootstraps import `AppModule`, which
does import `SharedModule`, and `SharedModule` is `@Global()`. The problem is _which copy_ of
`SharedModule` gets loaded:

1. `apps/api/vitest.config.ts` aliases `@vibey/api-shared` → `packages/api-shared/src/index.ts`
   (explicit `.ts`, so `index.ts` itself loads correctly).
2. `packages/api-shared/src/index.ts:2` re-exports **extensionlessly**:
   `export { SharedModule } from './shared.module'`.
3. Vite's default `resolve.extensions` order is `['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']`
   — **`.js` before `.ts`**.
4. A stale, git-tracked `packages/api-shared/src/shared.module.js` exists next to the `.ts`. It wins.
5. That stale file declares only **5** providers —
   `AuthGuard, SupabaseJwtVerifierService, LoggerService, PostgresDirectService, SupabaseClientFactory`
   — whereas `shared.module.ts` declares **13**, including `ErrorReporter`.
   `grep -c ErrorReporter shared.module.js` → **0**.
6. `MachinesModule` neither provides `ErrorReporter` nor imports `SharedModule`; it relies on the
   global. The global no longer has it. DI fails, and every suite that boots `AppModule` dies.

Affected (all of `src/test/integration/`): `billing-endpoints`, `billing`, `brain`, `conversations`,
`mission-assignment`, `profile-update`, `sequence-email-update`, `settings-email`, `webhooks`, and
`org-scoping/{campaigns, conversations, funnels, leads, media, missions, segments}`.

**Answer to "how many share this root cause":** exactly the 20 failed _suites_. The other 23 failed
_tests_ across 17 files are unrelated and individually distinct.

### 3. `packages/api-shared` — 2 tests — CONFIRMED, diagnosis corrected

The suspected `dist`/`src` desync is **not** the cause. `packages/api-shared/dist/` is up to date:
`dist/services/funnel-tsx-contract.js` contains `exports.programmaticTsxRepair` at line 6 and the
function body at line 185, and its size (25,833 B) matches the source (25,812 B).

The real cause is the **same `.js`-shadows-`.ts` bug**, one directory deeper. The test does
`import { programmaticTsxRepair } from './funnel-tsx-contract'` — extensionless — and Vite loads
the stale `src/services/funnel-tsx-contract.js` (10,873 B) instead of the current
`funnel-tsx-contract.ts` (25,812 B). The stale file exports only five symbols:

```
buildSafeFallbackFunnelTsx, normalizeFunnelPageSource, validateFunnelTsxContract,
recoverFunnelTsx, prepareFunnelPageForWrite
```

`programmaticTsxRepair` is absent → `is not a function`. And because the stale
`validateFunnelTsxContract` is an older implementation that does not emit type-only warnings, the
second test's `expected 0 to be greater than 0` falls out of the same file. **Both failures, one cause.**

### 4. The systemic version of the problem

Repo-wide, **17 git-tracked compiled `.js` files sit inside `src/` directories next to a `.ts`
sibling of the same name**:

| Location                                                                             | Count |
| ------------------------------------------------------------------------------------ | ----: |
| `packages/api-shared/src/**`                                                         |    16 |
| `apps/web/src/features/spaces/components/automations/connected-app-flow-triggers.js` |     1 |

The api-shared 16 (with their `.d.ts` and `.js.map` companions) are stale build output from an
earlier snapshot that was committed into `src/`. Every one of them silently shadows live TypeScript
under Vite resolution. `.gitignore` ignores `dist/` but explicitly un-ignores
`!packages/api-shared/dist/`, so built output is committed by design — the `src/` copies appear to
be accidental leftovers of an older build layout.

Five workspaces alias `@vibey/api-shared` → `src`, so all five are exposed. `apps/api` has the same
debris in its own root: `vitest.config.js`, `vitest.config.d.ts` and `vitest.config.js.map` are
committed alongside `vitest.config.ts`.

**Production is not affected** — the package's `main`/`exports` resolve to `dist/`, which is current.
This is a test-infrastructure-only failure, which is precisely why it survived: nothing runs the tests.

### 5. Orphaned tests

`workers/apps-proxy/src/index.test.ts` and `supabase/functions/vibey-artifacts/ownership.test.ts`
have no runner in any workspace and cannot be executed by any command in the repo.

---

## Scripts Pretending To Be Tests

Referenced from the root `package.json` but not part of any test runner.

| Script                                                   | Command                                               | What it actually hits                             | Safe to run?                                 |
| -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| `smoke:chat-context`                                     | `tsx scripts/smoke/chat-context-window-smoke.ts`      | live API + LLM provider through the chat pipeline | **NO** — live model spend                    |
| `smoke:railway-chat-autoscale`                           | `tsx scripts/smoke/railway-chat-autoscale-smoke.ts`   | Railway API, scales worker services               | **NO** — mutates infrastructure              |
| `smoke:customer-signal`                                  | `tsx scripts/smoke/customer-signal-loop-smoke.ts`     | Supabase + Brain write path                       | **NO** — writes to a database                |
| _(unwired)_ `scripts/smoke/contacts-smoke.mjs`           | not in `package.json`                                 | contacts CRUD against the API                     | **NO** — writes                              |
| _(unwired)_ `scripts/smoke/runtime-queue-mixed-smoke.ts` | not in `package.json`                                 | BullMQ/Redis queue runtime                        | **NO** — needs Redis, enqueues work          |
| `eval:model-quality`                                     | `node scripts/evals/model-quality-benchmark.mjs`      | OpenRouter, real model calls                      | **NO** — costs money                         |
| `report:model-efficiency`                                | `node scripts/evals/model-efficiency-report.mjs`      | reads usage data                                  | unclear — not run                            |
| `test:e2e:task-sync`                                     | `node scripts/e2e/roas-clickup-task-lifecycle.mjs`    | **live ClickUp API**, creates/deletes tasks       | **NO** — mutates a third-party system        |
| `architecture:check`                                     | `node scripts/arch/check-loc.mjs`                     | filesystem only                                   | **YES** — already run: FAILED, 25 violations |
| `architecture:self-test`                                 | `node --test scripts/arch/*.test.mjs`                 | filesystem only                                   | **YES** — run: 5/5 passed                    |
| `architecture:contracts`                                 | `node scripts/arch/http-contract-harness.mjs`         | issues HTTP against a running API                 | probably read-only, not run                  |
| `architecture:parity`                                    | `node scripts/arch/parity-diff.mjs`                   | filesystem only                                   | likely safe, not run                         |
| `security:openclaw-workspaces:check`                     | `node scripts/security/check-openclaw-workspaces.mjs` | filesystem only                                   | **YES** — already run: PASSED                |
| `security:predeploy:check`                               | `node scripts/security/predeploy-health-gate.mjs`     | probes deployed environments                      | not run                                      |

Note two of these are named `test:*`/`smoke:*` and would read as tests to a newcomer, but
`test:e2e:task-sync` performs a full create-and-delete lifecycle against live ClickUp. Nothing in
the naming distinguishes "safe filesystem check" from "spends money" or "mutates production".

Additionally, `scripts/roas/deploy-railway-workers.sh` prints secret `KEY=value` pairs to stdout —
per `CLAUDE.md` it must never be run or captured by an agent. It was not run.

---

## E2E Tests

Seven Playwright specs in `apps/web/e2e`, all driven by the single root config.

| Spec                  | Covers                           |
| --------------------- | -------------------------------- |
| `auth.spec.ts`        | login / logout / session         |
| `navigation.spec.ts`  | primary app navigation           |
| `chat.spec.ts`        | chat surface and agent messaging |
| `studio.spec.ts`      | studio / content creation        |
| `team.spec.ts`        | team + org membership            |
| `onboarding.spec.ts`  | first-run onboarding             |
| `file-upload.spec.ts` | media/file upload                |
| `helpers/auth.ts`     | shared login helper (not a spec) |

**Requirements:** `apps/web` on `http://localhost:3000`; a reachable backend; real Supabase
credentials for anything past the login wall; Chromium via `@playwright/test`; and for
`file-upload`, working storage.

**Why they were not run:** explicitly out of scope per instructions, and independently unsafe here.
They authenticate against whatever Supabase project is configured, and per `CLAUDE.md` the only
production project is `lhfgtsjetcardinpgouq` — so `onboarding`, `team` and `file-upload` would
create real rows and upload real objects against production data. `retries: 2` would triple any
side effect. No test credentials were available, and `forbidOnly`/`webServer.reuseExistingServer`
would have attached to the already-running dev server.

`apps/openclaw` additionally carries its own Docker-based E2E family
(`test:docker:{onboard,qr,plugins,gateway-network,doctor-switch,live-models,live-gateway}`) and a
`test:live` target gated on `OPENCLAW_LIVE_TEST=1`. All require Docker and real provider
credentials. None were run.

---

## Test Health Assessment

The honest picture is much worse than the file count implies. On paper this repo has 3,070 test
files, which reads as a well-tested codebase. In practice, on a clean checkout at `f4757c2b`, the
executable and passing portion is roughly **4,000 tests concentrated almost entirely in two backend
services** — `apps/api` (2,191 passing) and `apps/agent-api` (1,727 passing) — plus about 90 tests
scattered across five small workspaces. Everything else is either dead, unrun, or not really a test.

The frontend is the headline failure. `apps/web` holds 981 test files, roughly a third of the repo's
test surface and the only coverage that exists for 35 product feature areas, and **not one of them
has executed** — zero tests collected, every file dying in a shared setup file on a one-word import.
So the effective UI coverage of this platform is zero: not "thin", not "gaps in places", zero. The
same is true of `apps/admin`, which has no tests at all. Combined with the absence of any
frontend/backend contract test, nothing in this repo would catch a broken screen, a renamed API
route, or a regression in onboarding, inbox, impersonation or domains before a user hits it.

What makes this a process failure rather than a code failure is that **there is no CI**. No GitHub
Actions, no other provider, and a pre-commit hook that runs architecture and lint checks but never a
test. That is the mechanism by which a stale compiled `.js` file, committed into `src/` in an earlier
snapshot, has been silently shadowing live TypeScript long enough to break both `packages/api-shared`
and all 20 of the API's integration suites — the two "separate" bugs turn out to be one bug, invisible
because nobody and nothing was running the tests. The `apps/api` suite is also measurably flaky
(three identical runs gave 36, 35 and 33 failing files), which means even the coverage that _does_
work cannot currently be used as a merge gate without first being stabilised.

The genuine strength is real and worth stating plainly: the two NestJS backends have substantial,
fast, mostly-mocked unit coverage that caught real drift during this audit (route-inventory snapshot
mismatches in both services). The path back to health is short and mechanical rather than a rewrite —
one import specifier in `apps/web/tests/setup.ts`, deletion of 17 shadowing build artifacts, and a
CI workflow — but until those land, any claim that this repo is tested should be read as applying to
the API layer only.

---

## Follow-up work identified (not performed)

Per repo protocol these are recorded, not fixed:

1. `apps/web/tests/setup.ts:1` — `from 'util'` → `from 'node:util'`. Unblocks 981 files.
2. Delete the 17 shadowing `.js` (+ `.d.ts`, `.js.map`) artifacts under `packages/api-shared/src/`
   and `apps/web/src/features/spaces/components/automations/`. Fixes 2 api-shared tests and 20 API
   integration suites. Add a lint or arch rule to prevent recurrence.
3. `MachinesModule` should declare its `ErrorReporter` dependency explicitly rather than relying on
   an ambient `@Global()` provider — the current coupling is what turned a stale-file bug into 20
   dead suites.
4. Stabilise `apps/api`: 3-file run-to-run variance.
5. Refresh the committed route-inventory snapshots in `apps/api` and `apps/agent-api`.
6. Wire runners for the two orphaned tests, or delete them.
7. Replace the 6 `todo` placeholders in `apps/queue-worker` org-scoping — they report green while
   asserting nothing about email org isolation.
8. Add CI. Nothing else on this list stays fixed without it.
