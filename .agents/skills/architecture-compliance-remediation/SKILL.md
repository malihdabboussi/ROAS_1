---
name: architecture-compliance-remediation
description: Use when continuing Vibey architecture compliance remediation, especially phased Type A/B/C/D cleanup batches and Phase 3 apps/web frontend cleanup. Applies to backend NestJS controllers, services, helpers, repositories, tests, React components, hooks, stores, shared components/lib boundaries, LOC violations, cross-feature imports, generated debris, direct Supabase/RPC/storage/createClient access outside repositories/providers, or replace-not-accumulate cleanup. Follow context-first, TDD-first remediation with characterization tests, focused refactors, frontend render-stability/runtime checks when touching React state/effects, lint/typecheck, LOC/direct scans, changelog, and follow-up logging. Do not run builds unless the user explicitly requests a build.
---

# Architecture Compliance Remediation

## Core Loop

Use this order for every batch:

1. Load current plan state from `.docs/plans/architecture-compliance-remediation.md`.
2. Select a cohesive batch. Prefer 5-10 files only when the files share the same boundary and risk profile; reduce the batch if inheritance, shared state, or missing tests make it risky.
3. Read complete context before edits: full target files, imports, consumers, module wiring, existing tests, related repositories/providers, usage grep, and useful git history.
4. Add or update characterization tests for the current behavior before refactoring.
5. Run the focused tests before the move when practical. For frontend React/store/effect work, include a mounted Testing Library baseline, not only typecheck or pure helper tests. If a test fails because it exposes existing behavior, fix the test or scope before changing production code.
6. Apply the active remediation type without changing behavior:
   - Type C / Type C-H: move data/integration access behind repositories or providers.
   - Type D: split LOC/headroom pressure into focused services/helpers/tests inside the same module; do not introduce repository movement unless the split exposes a real data-access boundary.
   - Phase 3 frontend: move cross-feature UI/contracts into `src/components` or `src/lib`, keep smart store/service wiring in feature containers or wrappers, and split oversized components by cohesive render/state concern.
7. Remove replaced inline code, dead imports, dead exports, duplicate helpers, and generated debris in the same change.
8. Rerun the same tests and the focused verification set.
9. Update plan, changelog, LOC checks, and follow-up work log before reporting.

## Context Requirements

Read the matching local skills and guidelines before editing:

- `.agents/skills/guidelines-follow/SKILL.md`
- `.agents/skills/architecture-follow/SKILL.md`
- `.agents/skills/100-sure-framework/SKILL.md` when the change is non-trivial or risky
- `.docs/guidelines/development/code-guidelines.md`
- `.docs/guidelines/development/code-guidelines-backend.md`
- `.docs/guidelines/architecture/project-architecture.md`
- `.docs/guidelines/architecture/backend-architecture.md`
- `.docs/guidelines/architecture/feature-guidelines.md`
- For frontend JSX/style work, also read `.docs/guidelines/design/design-guidelines.md` and grep the relevant utility classes in `apps/web/src/app/globals.css`.

Use `rg` first for usage scans. Check git history for changed symbols when the reason for a pattern is unclear.

## Architecture Rules

Keep NestJS layers clean:

- Controllers handle HTTP only.
- Services orchestrate business behavior only.
- Repositories/providers own database, Supabase, RPC, storage, service-role client construction, and external integration access.
- Module providers must register new repositories/providers.
- Preserve public service method contracts unless the plan explicitly asks for a contract change.
- Do not rename files arbitrarily.
- Do not run builds unless the user explicitly asks for a build.

Use file limits from the project architecture:

- Controllers: 200 LOC.
- Services: 600 LOC.
- Repositories/integrations: 400 LOC.
- Utilities/hooks/nodes/types: use the applicable project limit.
- Frontend components: 400 LOC unless the active plan documents a stricter target; oversized parent files stay open until split below the limit or explicitly deferred.

## Type D LOC Decomposition

For Phase 1 Type D work, treat the current tree as behavior-locked baseline and reduce near-limit files before they become new hard violations.

- Prefer one module per batch when inheritance, protected helpers, or shared tests are involved.
- Split services by orchestration concern, not by arbitrary line count.
- Preserve public service method names, argument shapes, return shapes, controller contracts, module exports, and route snapshots.
- When controllers or external modules inject the target service, keep a thin public facade and extract cohesive internal workflow services behind it.
- Add a new service/helper only when it owns a cohesive concern and lowers future change risk.
- Keep extracted classes in the same module boundary and register providers in the module.
- For oversized tests, split by behavior family while keeping the same assertions and fixture semantics. For facade-preserving service splits, either keep behavior tests through the facade with the extracted service wired in, or add direct tests for the extracted service plus minimal facade delegation coverage.
- Update `.docs/plans/agent-follow-up-work.md` entries from `Open` to resolved only after the focused test/LOC verification proves the backlog item is actually handled.
- For Phase 2 `apps/agent-api` Type D scans, include every nested `*.service.ts` under `apps/agent-api/src/modules`, not only files directly inside `services/` folders. Use `wc -l` semantics for the hard limit so exact-600 files are compliant and only files above 600 remain blockers.

## TDD Pattern

Write tests against behavior that already works before moving code. Prefer focused service tests that mock repositories/providers and assert:

- existing happy path outputs,
- existing edge/error behavior,
- repository/provider calls that replace direct access,
- no behavior-only refactor changed user-visible results.

After production edits, rerun the same test command. Do not rely only on typecheck for behavior-preserving moves.

## Frontend Phase 3 Runtime Guard

For `apps/web` React remediation, treat `typecheck`, ESLint, and pure helper tests as insufficient when the slice touches component state, hooks, stores, contexts, effects, streaming/chat flows, router behavior, or provider wiring.

Required frontend guard:

- Add or extend a React Testing Library characterization test that mounts the affected component/hook through its realistic wrapper or the smallest faithful harness.
- Run that mounted test on unchanged behavior before the refactor whenever practical, then rerun it after the move.
- For any `useEffect`, store selector, context provider, memoized callback, streaming/chat state, or event listener change, add a render-stability assertion that the mounted unit settles without a maximum-update-depth loop or repeated state churn under representative prop/store updates.
- Keep shared `src/components` pieces dumb: props in, callbacks out, no feature store/service/router imports. Keep smart wiring in feature containers or compatibility wrappers.
- For risky frontend surfaces such as chat panels, model pickers, artifact viewers, editors, or route-level flows, run a browser/dev-server smoke check after tests. Verify the screen opens, the affected interaction works, and the console has no maximum-update-depth, hydration, or repeated render-loop errors. If the browser smoke cannot run, report that as a verification gap and do not claim runtime-safe.
- Do not use frontend architecture cleanup to add new behavior, fallback UX, or broad error handling unless the plan explicitly asks for it.

## Direct Access Scan

For backend Type C cleanup, scan services/controllers/helpers for direct access:

```bash
rg -n -P "(?<!Array)(?<!Buffer)\\.from\\(|\\.rpc\\(|\\.storage\\.|createClient\\(" apps/api/src/modules/<module> --glob '*.ts' --glob '!*.test.ts'
```

Expected state after a service cleanup:

- service target is clean for direct Supabase/RPC/storage/createClient access,
- repository/provider contains the data access,
- tests mock the repository/provider rather than Supabase chains,
- remaining hits are either in repositories/providers or documented as the next batch.
- `Array.from` and `Buffer.from` are not data-access hits and should not be counted.

## Verification

Run the smallest verification that proves the batch, plus the project-required checks:

```bash
pnpm --filter @vibey/api test -- <focused-test-files>
pnpm --filter @vibey/api exec eslint <changed-ts-files>
pnpm --filter @vibey/api typecheck
pnpm --filter @vibey/web test -- <focused-test-files>
pnpm --filter @vibey/web exec eslint <changed-ts-or-tsx-files>
pnpm --filter @vibey/web typecheck
wc -l <changed-code-files>
git diff --check
rg -n "[ \t]$" <changed-and-new-files>
find .docs/logs -name 'changelog*.md' -mtime +14 -print
```

Use the backend commands for backend batches and the web commands for frontend batches. Add browser smoke verification for frontend runtime-risk slices. Do not run builds unless explicitly requested.

`git diff --check` does not inspect untracked files. When a batch creates new files, run the direct trailing-whitespace `rg` scan on all scoped changed/new files before reporting verification clean.

If stale changelog files are printed, prune only repo changelog files required by `AGENTS.md`.

## Logs And Plans

After edits, update:

- `.docs/plans/architecture-compliance-remediation.md` with completed files, current status, and remaining work.
- `.docs/plans/agent-follow-up-work.md` for touched files over/near limits or adjacent real debt deferred out of scope.
- `.docs/logs/changelog$(date +%Y-%m-%d).md` with `What`, `Why`, `Impact`, and `Files`.

Skip feature documentation for pure behavior-neutral refactors unless behavior, API, schema, or user-facing states changed.

## Generated Debris Rule

"Generated debris" means removable artifacts that are not intended source of truth: unused scaffolding, duplicate replacement code, dead imports/exports, abandoned temporary files, stale generated stubs, or inline code replaced by a repository/provider. It does not mean deleting user work or removing old behavior that is still used.

If confidence is at least 90% that replaced code is unused, remove it in the same change and verify. If confidence is below 90%, stop and ask with the evidence.
