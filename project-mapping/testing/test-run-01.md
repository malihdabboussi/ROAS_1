# Test Run 01

## Environment

| Item                 | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| Date                 | Saturday 2026-09-05, 23:34 – 00:05 CET (UTC+1)                             |
| OS                   | macOS 14.8.5 (Darwin 23.6.0, build 23J423), x86_64                         |
| Host                 | `malihs-MacBook-Pro-2.local`                                               |
| Node                 | **22.23.2** (via `nvm use 22`) — repo requires 22; 20/21/23 also installed |
| pnpm                 | 9.15.4 (invoked as `npx --yes pnpm@9.15.4`)                                |
| Package manager root | `/Users/malihdabboussi/Desktop/projects/ROS/ROAS-X-1DSLABS`                |
| vitest               | 2.1.9 in most workspaces; 4.0.18 in `mission-worker` and `openclaw`        |
| Test DB / Redis      | none — no Redis, no local Supabase                                         |

Environment preamble used for every command:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
```

Notable environment finding: an npm `util@0.12.5` package resolves from
`/Users/malihdabboussi/Desktop/projects/node_modules/util` — a stray `node_modules` directory in the
**parent folder of the checkout**, not inside the repo. It is present in neither the repo root nor
`apps/web`. This stray dependency is load-bearing for the `apps/web` test failure (see _Findings_).

## Commit

```bash
git rev-parse --short HEAD        → f4757c2b
git branch --show-current         → main
git status --porcelain | wc -l    → 13
```

Working tree: **13 dirty files** at start of run. Verified still 13 at end of run — no source file
was modified, and the two temporary probe files created for the `node:util` experiment were deleted
and confirmed absent from `git status`.

## Services Running

| Service                 | Port  | State    | Notes                                                                              |
| ----------------------- | ----- | -------- | ---------------------------------------------------------------------------------- |
| `apps/api` (NestJS)     | 3001  | **UP**   | booted earlier this session with `VERCEL=1 PORT=3001` to suppress in-process crons |
| `apps/web` (Next.js 16) | 3000  | **UP**   | dev server                                                                         |
| `apps/agent-api`        | 3003  | **DOWN** | not started                                                                        |
| OpenClaw gateway        | 18789 | **DOWN** | not started                                                                        |
| Redis (BullMQ)          | 6379  | **DOWN** | no queue processing possible                                                       |

Confirmed at start of this run:

```bash
nc -z 127.0.0.1 3001  → succeeded  (3001 UP)
nc -z 127.0.0.1 3000  → succeeded  (3000 UP)
nc -z 127.0.0.1 3003  → refused    (3003 DOWN)
nc -z 127.0.0.1 6379  → refused    (redis DOWN)
```

Neither running server was restarted. Only HTTP `GET` was issued against them. No `POST`, `PUT`,
`PATCH` or `DELETE` was sent to any host at any point.

## Commands Used

Discovery / inventory (read-only):

```bash
git rev-parse --short HEAD
git status --porcelain | wc -l
git branch --show-current
rg --files -g '*.test.ts' -g '*.test.tsx' -g '*.test.js' -g '*.test.mjs' -g '*.spec.ts' -g '*.spec.tsx' -g '!**/node_modules/**' -g '!**/dist/**' | wc -l
rg --files -g '*.test.ts' ... | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn
rg --files -g 'vitest.config.*' -g 'vitest.workspace.*' -g '!**/node_modules/**'
rg --files -g 'playwright*.config.*' -g '!**/node_modules/**'
rg --files -g 'jest.config.*' -g '!**/node_modules/**'
ls -la .github/workflows                     # → does not exist
ls .husky && cat .husky/pre-commit
cat pnpm-workspace.yaml
node -e "const t=require('./turbo.json'); ..."   # turbo test pipeline
rg -ln "createTestingModule" apps/api/src --glob '*.test.ts'
rg -n "MachinesModule" apps/api/src --glob '*.ts' -l
git ls-files | grep -E '(^|/)src/.*\.js$'    # shadowing artifact scan
```

Test suites executed:

```bash
npx --yes pnpm@9.15.4 --filter @vibey/api-shared test
npx --yes pnpm@9.15.4 --filter @vibey/api test                 # run twice, full output captured
npx --yes pnpm@9.15.4 --filter @vibey/agent-api test
npx --yes pnpm@9.15.4 --filter @vibey/queue-worker test
npx --yes pnpm@9.15.4 --filter @vibey/funnels test
npx --yes pnpm@9.15.4 --filter @roas/openrouter-model-scout test
npx --yes pnpm@9.15.4 --filter @vibey/mission-worker test
npx --yes pnpm@9.15.4 --filter @vibey/agent-policy test
npx --yes pnpm@9.15.4 architecture:self-test
```

Resolution probe (throwaway config + probe spec, both deleted immediately after):

```bash
cd apps/web && npx vitest run --config tmp-probe.vitest.config.ts
```

Read-only HTTP probes:

```bash
curl -s -o /tmp/body.txt -w "%{http_code} %{size_download}b" --max-time 12 "http://localhost:3001$p"
curl -s -o /tmp/w.txt   -w "%{http_code} redirect=%{redirect_url} %{size_download}b %{time_total}s" --max-time 60 "http://localhost:3000$p"
```

Static resolution checks:

```bash
node -e "require.resolve('util/package.json',{paths:['.../apps/web']})"
grep -oE "^exports\.[A-Za-z_]+" /Users/malihdabboussi/Desktop/projects/node_modules/util/util.js
grep -c "programmaticTsxRepair" packages/api-shared/dist/services/funnel-tsx-contract.js   # → 2
grep -c "programmaticTsxRepair" packages/api-shared/src/services/funnel-tsx-contract.js    # → 0
grep -c "ErrorReporter" packages/api-shared/src/shared.module.js                           # → 0
```

**Not run, deliberately:** `pnpm build` / `turbo build`; any seed, migration or DB-writing script;
Playwright E2E; `apps/openclaw` suites; all `smoke:*` and `eval:*` scripts;
`scripts/roas/deploy-railway-workers.sh` (prints secrets).

## Scenarios Tested

1. Inventory every test file in the monorepo and reconcile per-app counts to the repo total.
2. Determine each workspace's runner, version, environment and setup file.
3. Establish whether any CI would run these tests.
4. Execute every unit suite that is small and safe (no network, no DB, no Docker).
5. Confirm or correct the suspected root cause of the `packages/api-shared` failures.
6. Confirm or correct the suspected root cause of the `apps/api` `ErrorReporter` DI failure, and
   quantify how many failures share it.
7. Confirm the `apps/web` `util` / `node:util` resolution hypothesis empirically.
8. Classify the smoke/eval scripts by what they would actually touch.
9. Probe the two running dev servers with read-only GETs to confirm earlier observations.
10. Re-run `apps/api` a second and third time to test determinism.

## Passed

| Suite                                |                Files |              Tests | Duration                      |
| ------------------------------------ | -------------------: | -----------------: | ----------------------------- |
| `packages/agent-policy`              |                    5 |          53 passed | ~2 s                          |
| `apps/openrouter-model-scout`        |                    5 |          11 passed | 2.32 s                        |
| `apps/funnels`                       |                    5 |          10 passed | 1.84 s                        |
| `apps/queue-worker`                  | 3 passed + 2 skipped |   3 passed, 6 todo | 1.76 s                        |
| `scripts/arch` (`node --test`)       |                    2 | 5 passed, 0 failed | 139 ms                        |
| `security:openclaw-workspaces:check` |                    — |                  — | PASSED (earlier this session) |

Runtime checks that passed:

- `apps/api` booted on Node 22 with `VERCEL=1 PORT=3001`; TypeScript reported `Found 0 errors`;
  NestJS mapped **1,632 routes**; cold boot ~3.5 min.
- `apps/web` booted on Node 22, `Ready in` ~40 s.
- `GET /api` → `200 {"status":"ok","service":"vibey-api","version":"0.1.0"}` (re-confirmed this run,
  94 bytes, timestamp `2026-09-05T22:52:17.171Z`).
- `GET /api/users/me` with no auth → `401 {"message":"Missing or invalid Authorization header"}`;
  API logged `WARN [AuthGuard] [AUTH] missing_authorization_header`. Correct auth behaviour.
- `GET /.well-known/oauth-authorization-server` → 200, full MCP OAuth metadata advertising 20 scopes;
  issuer `http://localhost:3001`, authorize/token/register/revoke endpoints all under `/api/mcp/oauth/`.

## Failed

| Suite                 |   Files failed |        Tests failed | Nature                                    |
| --------------------- | -------------: | ------------------: | ----------------------------------------- |
| `apps/web`            | **981 of 981** |         0 collected | total collapse in `setupFiles`            |
| `apps/api`            |     33 (run 3) | 23 + 20 dead suites | 1 shared DI cause + 23 distinct           |
| `apps/agent-api`      |      11 of 269 |         22 of 1,758 | all distinct                              |
| `packages/api-shared` |        1 of 23 |            2 of 119 | one shared cause                          |
| `apps/mission-worker` |        1 of 70 |            1 of 293 | 5 s timeout                               |
| `architecture:check`  |              — |       25 violations | 24 LOC growth/new, 1 cross-feature import |

### `apps/api` determinism — three runs, same commit

| Run                      | Files failed | Tests failed |
| ------------------------ | -----------: | -----------: |
| 1 (earlier this session) |           36 |           27 |
| 2                        |           35 |           26 |
| 3 (full output captured) |           33 |           23 |

Run 3 final line: `Test Files  33 failed | 507 passed | 1 skipped (541)` /
`Tests  23 failed | 2191 passed | 87 skipped | 20 todo (2321)` / `Snapshots  1 failed`.
Duration 279.75 s. **The suite is flaky by ~3 files run-to-run.**

### `apps/api` failure split (run 3)

Vitest reported `Failed Suites 20` and `Failed Tests 23`, numbering failures `[N/43]`.

- **20 failed suites** — every file under `src/test/integration/`: `billing-endpoints`, `billing`,
  `brain`, `conversations`, `mission-assignment`, `profile-update`, `sequence-email-update`,
  `settings-email`, `webhooks`, and `org-scoping/{campaigns, conversations, funnels, leads, media,
missions, segments}`. **All 20 share one root cause.** The `ErrorReporter` error text appears
  exactly **once** in
  the entire output (`grep -c "ErrorReporter at index"` → 1) and is attributed to all of them.
- **23 failed tests** across 17 other files, each distinct:

| Error                                                                  | Count |
| ---------------------------------------------------------------------- | ----: |
| `this.slackRuntimeRepo.listLinkedSlackIdentityState is not a function` |     3 |
| `this.repo.findSpaceByIdForAccess is not a function`                   |     2 |
| `supabase.from(...).select is not a function`                          |     2 |
| `expected [] to have a length of 1 but got +0`                         |     2 |
| route-inventory snapshot mismatch                                      |     1 |
| `ENOENT: docker/agents/hr/ROLE.md`                                     |     1 |
| assorted one-off assertions                                            |    12 |

### `apps/agent-api` failures (22 tests, 11 files)

| Error                                                                                         | Count |
| --------------------------------------------------------------------------------------------- | ----: |
| `this.campaignContext.buildCampaignSummary is not a function`                                 |     4 |
| `supabase.from(...).select(...).neq(...).order is not a function`                             |     2 |
| skill-scope precedence (`global-skill` vs `user-skill`/`org-skill`, `wildcard` vs `specific`) |     3 |
| `this.table(...).select is not a function`                                                    |     1 |
| route-inventory snapshot mismatch                                                             |     1 |
| `Test timed out`                                                                              |     1 |
| assorted one-off assertions                                                                   |    10 |

Failing files: `artifacts/**` (4), `chat/**` (3), `billing/credits.service`,
`agent-sync/agent-runtime-skill-scope.service`, `test/contract/route-inventory`.
No suite-level collapse — all 255 other files collected and ran.

## Blocked

| Item                                     | Why                                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` unit suite (981 files)        | broken at setup; nothing collectable                                                                                                                                                                                    |
| Playwright E2E (7 specs)                 | out of scope; also would authenticate against a real Supabase project and, in `onboarding`/`team`/`file-upload`, create real rows and upload real objects. `retries: 2` would triple side effects. No test credentials. |
| `apps/openclaw` (1,157 files)            | out of scope (slow); custom `scripts/test-parallel.mjs` orchestrator; sibling targets need Docker and live model credentials                                                                                            |
| All `smoke:*` scripts                    | write to Supabase / call live LLMs / mutate Railway infrastructure                                                                                                                                                      |
| `eval:model-quality`                     | real OpenRouter model calls, costs money                                                                                                                                                                                |
| `test:e2e:task-sync`                     | full create-and-delete lifecycle against **live ClickUp**                                                                                                                                                               |
| Root `pnpm test`                         | `turbo` `test` task `dependsOn: ["^build"]`; builds are forbidden                                                                                                                                                       |
| Any authenticated web/API flow           | no credentials, and the configured Supabase project may hold real data — **no login was performed**                                                                                                                     |
| Redis-dependent paths                    | no Redis on 6379                                                                                                                                                                                                        |
| `agent-api` / OpenClaw runtime behaviour | services not running                                                                                                                                                                                                    |

## Unexpected Behavior

1. **The two "separate" root causes are one bug.** The `packages/api-shared` failure and the
   `apps/api` `ErrorReporter` DI failure both come from stale compiled `.js` files committed inside
   `packages/api-shared/src/` shadowing their `.ts` siblings under Vite's resolution order.
2. **The suspected `dist`/`src` desync was backwards.** `dist/` is _current_ — it contains
   `exports.programmaticTsxRepair`. It is `src/` that holds the stale copy.
3. **The `ErrorReporter` DI error is not a missing module import.** `AppModule` does import
   `SharedModule`, and `SharedModule` is `@Global()`. The wrong _copy_ of it loads.
4. **The `util` shim lives outside the repository** — `/Users/malihdabboussi/Desktop/projects/node_modules/util`.
   The frontend test suite is broken by a dependency in the checkout's parent directory.
5. **`apps/api` is flaky**: 36 → 35 → 33 failing files across three identical runs.
6. **`apps/queue-worker` reports green while testing nothing important** — both org-scoping files
   are 100% `todo` (6 placeholder tests, zero assertions).
7. **Three workspaces fake a passing test run** with `"test": "echo 'No tests yet'"`, which exits 0
   and shows green under `turbo test`.
8. **Two test files can never run at all** — `workers/apps-proxy/src/index.test.ts` (workspace not
   listed in `pnpm-workspace.yaml`) and `supabase/functions/vibey-artifacts/ownership.test.ts`.
9. **Committed build debris in `apps/api` root**: `vitest.config.js`, `vitest.config.d.ts` and
   `vitest.config.js.map` sit next to `vitest.config.ts`.
10. **Route-inventory snapshots have drifted in both backends simultaneously** — the committed
    method+path inventory no longer matches the live route tables of `apps/api` or `apps/agent-api`.
11. **`GET /pricing` on the web app returns 404** rather than a marketing page, taking 4.96 s to do
    so (first compile).

## Console Errors

From the `apps/web` resolution probe under jsdom (throwaway config, since deleted):

```
PROBE bare-util TextEncoder = undefined
PROBE node-util TextEncoder = function
Test Files  1 passed (1)
```

This is the confirmation that `import { TextEncoder } from 'util'` yields `undefined` under
vitest 2.1.9 + jsdom, while `from 'node:util'` yields the real constructor. `apps/web/tests/setup.ts:9`
then executes `class TextEncoder extends undefined`, which throws at module scope and takes down all
981 files before collection.

Deprecation notice emitted by every vitest 2.1.9 workspace:

```
The CJS build of Vite's Node API is deprecated.
```

pnpm warnings emitted on every filtered command (openclaw config in the wrong place):

```
apps/openclaw | WARN The field "pnpm.minimumReleaseAge" was found in apps/openclaw/package.json.
                    This will not take effect. You should configure it at the root of the workspace instead.
apps/openclaw | WARN The field "pnpm.overrides" ... (same)
apps/openclaw | WARN The field "pnpm.onlyBuiltDependencies" ... (same)
```

No browser console was opened — no interactive browsing was performed.

## Backend Errors

From the running `apps/api` on :3001, triggered by this run's read-only probes:

```
WARN [AuthGuard] [AUTH] missing_authorization_header
```

Emitted on `GET /api/users/me` without credentials. This is correct, intended behaviour.

Startup warnings observed when `apps/api` booted (graceful degradation, not failures) — features
disable themselves rather than crashing the process:

```
DEEPGRAM_API_KEY not configured   → transcription disabled
FIRECRAWL_API_KEY not configured  → crawling disabled
SENDGRID_API_KEY not configured   → email sending disabled
STRIPE_SECRET_KEY not configured  → billing disabled
```

From the test process (not the server), `apps/api` produced one filesystem error:

```
Error: ENOENT: no such file or directory, open
  '/Users/malihdabboussi/Desktop/projects/ROS/ROAS-X-1DSLABS/docker/agents/hr/ROLE.md'
```

A test expects an agent role definition file that is not present in the checkout.

No 5xx was returned by any endpoint probed. The API remained healthy throughout.

## Database Errors

**None — no database was contacted.**

No migration, seed or write script was executed. No Supabase project was queried. `apps/api`'s test
setup (`src/test/setup.ts`) injects placeholder credentials (`https://test.supabase.co`, fake service
role/anon keys, fake Stripe keys) and a fully mocked chainable Supabase client, so the entire API
suite runs offline.

Several test failures _resemble_ database errors but are mock-shape defects, not real DB problems —
the mock chain in `src/test/setup.ts` does not implement every method the code now calls:

```
TypeError: supabase.from(...).select is not a function
TypeError: supabase.from(...).select(...).neq(...).order is not a function
TypeError: this.table(...).select is not a function
```

The `CHAINABLE_QUERY_METHODS` list in the shared mock has drifted behind the query builders used in
`space-automation-runs.repository.ts` and the agent-api campaign/context services.

## Screens / Routes Tested

All via read-only `GET`. No authentication, no form submission, no mutation.

### `apps/web` on :3000

| Route                | Status                      |     Size |    Time | Title                    |
| -------------------- | --------------------------- | -------: | ------: | ------------------------ |
| `/`                  | 307 → `/login?redirect=%2F` |     19 B |  0.15 s | —                        |
| `/login`             | 200                         | 59,675 B |  0.25 s | `Account \| ROAS`        |
| `/register`          | 307 → `/login`              |      6 B | 0.006 s | —                        |
| `/forgot-password`   | 200                         | 56,808 B |  0.10 s | `Account \| ROAS`        |
| `/shared/space/test` | 200                         | 50,978 B |  0.16 s | `Shared Space \| ROAS`   |
| `/a/test`            | 404                         | 57,763 B |  0.28 s | `Page not found \| ROAS` |
| `/pricing`           | 404                         | 47,260 B |  4.96 s | `Page not found \| ROAS` |

Times above are warm (routes compiled earlier in the session). First-compile timings recorded
earlier: `/forgot-password` 22.4 s, `/shared/space/test` 6.6 s, `/a/test` 43.6 s.

`/register` redirecting to `/login` is intentional — public signups are closed via
`NEXT_PUBLIC_WAITLIST_MODE`. Page titles correctly append `| ROAS` per repo convention.

### `apps/api` on :3001

| Route                                     | Status | Body                                                                        |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `/api`                                    | 200    | `{"status":"ok","service":"vibey-api","version":"0.1.0","timestamp":"..."}` |
| `/api/users/me`                           | 401    | `{"message":"Missing or invalid Authorization header",...}`                 |
| `/.well-known/oauth-authorization-server` | 200    | full MCP OAuth metadata, 20 scopes                                          |
| `/api/health`                             | 404    | `{"message":"Cannot GET /api/health",...}`                                  |
| `/health`                                 | 404    | empty body                                                                  |
| `/.well-known/oauth-protected-resource`   | 404    | empty body                                                                  |
| `/api/orgs`                               | 404    | `{"message":"Cannot GET /api/orgs",...}`                                    |

Worth noting: with 1,632 routes mapped there is **no health endpoint** at either `/health` or
`/api/health`. Liveness has to be inferred from `GET /api`. And although the API advertises
`/.well-known/oauth-authorization-server`, it does **not** serve
`/.well-known/oauth-protected-resource`, which RFC 9728 MCP clients may expect alongside it.

## Findings

1. **One stale-artifact bug explains both backend test failures.** 16 git-tracked compiled `.js`
   files (plus `.d.ts` and `.js.map`) sit inside `packages/api-shared/src/` next to `.ts` siblings.
   Vite's default `resolve.extensions` order is `['.mjs','.js','.mts','.ts',...]` — `.js` wins any
   extensionless import. Consequences:
   - `src/services/funnel-tsx-contract.js` (10,873 B) shadows the `.ts` (25,812 B) and exports only
     5 symbols, none of them `programmaticTsxRepair` → both api-shared failures.
   - `src/shared.module.js` shadows the `.ts` and declares only 5 providers instead of 13, omitting
     `ErrorReporter` → `MachinesService` cannot resolve it → all 20 API integration suites die.

   Five workspaces alias `@vibey/api-shared` to `src`, so all five are exposed.
   **Production is unaffected** — `package.json` `main`/`exports` point at `dist/`, which is current.

2. **The frontend suite is killed by a dependency outside the repository.** `apps/web/tests/setup.ts`
   imports `TextEncoder` from bare `'util'`, which under jsdom resolves to `util@0.12.5` at
   `/Users/malihdabboussi/Desktop/projects/node_modules/util` — the checkout's _parent_ directory.
   That shim exports 25 symbols and contains zero occurrences of `TextEncoder`. Empirically
   confirmed that `'node:util'` resolves correctly under the same config. One word, 981 files.

3. **There is no CI.** `.github/` contains only `pull_request_template.md`. The only gate is a husky
   `pre-commit` running `architecture:check` and `lint-staged` — **no tests run on commit, push or
   PR.** This is the mechanism that let findings 1 and 2 persist.

4. **Effective coverage is API-only.** ~3,900 passing tests, essentially all in `apps/api` and
   `apps/agent-api`. Frontend coverage is zero (not thin — zero). `apps/admin` has no tests at all.
   Seven of 35 `apps/web/src/features/` directories have no test file even nominally, including
   `impersonation` and `onboarding`.

5. **`apps/api` is not merge-gate-ready** even once fixed: 3-file variance across identical runs.

6. **Test scripts are not safely named.** `test:e2e:task-sync` mutates live ClickUp; `smoke:*`
   write to Supabase, call live LLMs, or scale Railway services. Nothing in the naming separates
   "filesystem check" from "spends money".

7. **Both backends' route-inventory snapshots have drifted**, in the same run — the committed
   method+path contract no longer matches reality in either service.

8. **Green does not mean tested** in three places: `"test": "echo 'No tests yet'"` in three packages,
   6 `todo` placeholders standing in for `queue-worker` email org-scoping, and 2 orphaned test files
   with no runner at all.

## Questions Raised

1. Why are compiled `.js`/`.d.ts`/`.js.map` files committed inside `packages/api-shared/src/`?
   `.gitignore` ignores `dist/` but explicitly un-ignores `!packages/api-shared/dist/`, so shipping
   built output is deliberate — are the `src/` copies leftovers of an older layout that predates the
   `dist/` build, and is anything importing them on purpose?
2. How long has `apps/web`'s suite been dead? Git history shows a single squashed
   "Initial ROAS platform snapshot from VibeyV2 working tree (local only)" commit for these files, so
   the breakage cannot be dated from history. Was it ever green in this repository?
3. Is the stray `/Users/malihdabboussi/Desktop/projects/node_modules/` intentional? It changes
   dependency resolution for every project underneath it and is invisible to the repo's own tooling.
4. Should `MachinesModule` depend on an ambient `@Global()` `ErrorReporter` at all? The current
   coupling is what converted a stale-file bug into 20 dead suites.
5. Why do `mission-worker` and `openclaw` run vitest 4 while everything else runs 2.1.9 — deliberate,
   or drift? `openclaw` is vendored, but `mission-worker` is first-party.
6. Is `apps/openclaw` (1,157 tests) meant to be part of this repo's test responsibility, or is it a
   vendored dependency that should be excluded from `turbo test`? Today a bare `pnpm test` pulls it in.
7. Are the route-inventory snapshots meant to be regenerated as routes change, and if so by whom —
   there is no CI step and no documented refresh command.
8. Should `/pricing` exist? It 404s on the web app.
9. Should the API expose a real health endpoint? 1,632 routes and no `/health` or `/api/health`.
10. Is the missing `/.well-known/oauth-protected-resource` intentional, given the server advertises
    full OAuth authorization-server metadata for MCP?
11. What is `docker/agents/hr/ROLE.md`, expected by an `apps/api` test but absent from the checkout —
    should it be committed, or is the test obsolete?
12. Are the `queue-worker` email org-scoping tests `todo` because the behaviour is unimplemented, or
    because the tests were never written? Org isolation in the email pipeline is currently unverified.
