# Code Health Findings

> Read-only audit of the `vibey-v2` monorepo (product "ROAS"). Every finding carries a file path. Secrets are never reproduced.
> Companion: `07-dependency-map.md` (coupling, god files, cycles, layering). Cross-references: `05-api-map.md`, `06-database-map.md`, `08-auth-security.md`, `09-integrations.md`, `10-background-processes.md`, `11-configuration.md`.

## How To Read This

| Severity     | Definition                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRITICAL** | Can cause data loss, cross-tenant leakage, silent production corruption, or blocks any safe refactor of a core path. Fix before the next feature in that area. |
| **HIGH**     | Real defect risk or a structural problem that compounds with every change. Schedule deliberately.                                                              |
| **MEDIUM**   | Maintenance cost, confusion, or drift risk. No immediate failure mode.                                                                                         |
| **LOW**      | Cosmetic, isolated, or already contained by a guardrail. Clean up opportunistically.                                                                           |

Scan scope excludes `apps/openclaw` (vendored, 570,478 lines) unless stated. "non-test" excludes `*.test.*`, `*.spec.*`, `__tests__/`, and `dist/`.

## Summary Table

| Category                  | Count                                                                                          | Worst severity                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------- |
| Dead Code Candidates      | 3 dead packages (1,420 lines), 2 duplicated test files                                         | MEDIUM                           |
| Legacy Code               | 2 parallel feature rewrites (54,905 lines), 32 legacy-Supabase refs, 1 versioned `-v4` dir     | HIGH                             |
| Duplicate Implementations | 13 byte-identical cross-workspace groups, 4 paired chat stores, 6 duplicated `format*` helpers | HIGH                             |
| Temporary Scripts         | 144 script files; 8 in an explicit `one-off/` dir; 37,232-line demo seed tree                  | MEDIUM                           |
| Debug Code                | 32 `console.log/debug/info`, 3 TODOs, 1 `@ts-ignore`                                           | LOW                              |
| Hardcoded Values          | 98 UUID literals, ~54 localhost URLs, 19 `app.vibey.im` refs, 9 committed signed storage URLs  | HIGH                             |
| Commented-Out Code        | 20 lines                                                                                       | LOW                              |
| Unused Dependencies       | 0 unused runtime deps across 10 workspaces                                                     | LOW                              |
| Inconsistent Patterns     | Opt-in validation, 4 `cn()` copies, 3 `supabase-resilient-fetch` copies, `.base.ts` chains     | HIGH                             |
| Large Files               | 146 over gate limit, 43 over 2×, 19 over 3×, plus 32,508 gate-invisible lines                  | CRITICAL                         |
| Circular Dependencies     | 52 (web 9, api 30, agent-api 13)                                                               | HIGH                             |
| Missing Error Handling    | 82 empty `catch`, 480 comment-only `catch`, 376 no-op `.catch()`, 1,548 `void` fire-and-forget | HIGH                             |
| Missing Validation        | 88/336 `apps/api` controllers import a DTO; no global `ValidationPipe` in `apps/api`           | HIGH                             |
| Security Concerns         | 9 committed signed storage URLs, 5 direct-Supabase ESLint violations                           | HIGH (see `08-auth-security.md`) |
| Data Integrity Concerns   | `profiles` (89 refs) + `user_profiles` (19 refs) both live                                     | CRITICAL                         |
| Generated Output In Git   | 294 committed `dist` files, 5 `.tsbuildinfo`, 5 `next-env.d.ts`                                | MEDIUM                           |

---

## Dead Code Candidates

**MEDIUM — `packages/ui` is fully dead.** 9 lines in 2 files. Zero import sites anywhere (`rg "from '@vibey/ui"` → 0; the only textual match is its own `package.json:2`). Its entire content, `packages/ui/src/utils.ts`, is a 7-line `cn()` helper that is byte-identical to three other copies (see Duplicate Implementations). It is listed in `apps/web/next.config.js:11` `transpilePackages` for a package nothing imports.

**MEDIUM — `packages/widget-catalog` is fully dead.** 118 lines in 2 files, zero import sites.

**MEDIUM — `packages/db` (1,302 lines) has zero source importers.** Referenced only in build configuration: `apps/web/next.config.js:11` (`transpilePackages: ['@vibey/ui', '@vibey/db']`) and `apps/web/vitest.config.ts:39` (path alias). `packages/db/src/types.ts` is 1,292 lines of generated database types that no runtime code reads. Either wire it in as the canonical DB type source (which would be an improvement — see `06-database-map.md`) or delete it.

**LOW — `packages/context-breakdown` is a 71-line package.** It has 18 real import sites, so it is not dead, but a single-file 71-line workspace carries more overhead (build, versioning, `transpilePackages`) than value.

**LOW — `@vibey/sdk` has 3 import sites** across 598 lines. Marginal; worth confirming intent.

**LOW — duplicated test files.** Two test files exist byte-identical in two locations each, so one copy of each runs against code nothing imports:

- `apps/web/src/lib/reporting/resolve-reporting-dates.test.ts` = `apps/web/src/features/spaces/components/reporting/shared/resolve-reporting-dates.test.ts` (50 lines)
- `apps/web/src/components/funnels/funnel-settings/funnel-pixel-utils.test.ts` = `apps/web/src/features/studio/components/preview/funnel-settings/funnel-pixel-utils.test.ts` (14 lines)

**Not dead — recorded to prevent mistaken cleanup.** `apps/web/src/app/api/freeze-debug/route.ts` and `apps/web/src/lib/debug/freeze-diagnostics.ts` look like leftovers by name but are live production telemetry, wired via `apps/web/src/app/(dashboard)/providers.tsx` and `lib/api/backend-client.ts`. See Debug Code.

---

## Legacy Code

**HIGH — `features/team` and `features/team-2` are both live: 54,905 lines maintaining one domain twice.** `features/team` is 29,772 lines / 161 files; `features/team-2` is 25,133 lines / 163 files. Both are routed:

- `apps/web/src/app/(dashboard)/team/page.tsx` → `team-2`
- `apps/web/src/app/(dashboard)/team/teams/page.tsx` and `team/teams/[teamId]/page.tsx` → both
- `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx` → both
- `apps/web/src/app/(auth)/onboarding/components/OnboardingChannels.tsx` → `team-2` (2 imports)

Consumers are split too: cross-feature imports exist from `settings → team` (9) _and_ `settings → team-2` (1), plus `home → team-2` and `team-2 → settings`/`brain`/`mission-control`. Every team-domain bug must be triaged in both trees. 4 of the 9 `apps/web` circular dependencies are in `team-2` toolbar/popover pairs.

**HIGH — 32 references to the forbidden legacy Supabase project `qfrvykscoymiwwgysvsr`.** `CLAUDE.md` and `AGENTS.md §8` declare a hard stop: production is only `lhfgtsjetcardinpgouq`. Most of the 32 are _guardrails_ doing the right thing (`scripts/roas/verify-no-legacy-runtime-refs.sh:7`, `scripts/roas/verify-local-env-alignment.sh:13`, `scripts/import-user-brain/index.ts:21` and `backfill-embeddings.ts:19` both define `BLOCKED_HOSTS`, `scripts/roas/ingest-roas-brain-package.py:33`). But **9 are live hardcoded media URLs in shipped `apps/website` code** pointing at the legacy project's storage:

- `apps/website/src/lib/agent-library-fallback.ts` lines 14, 30, 46, 62, 78, 96, 114, 132, 147
- `apps/website/src/lib/marketing-hr-showcase-data.ts:20`
- `apps/website/src/lib/feature-pages-content/{studio.ts:151, skills.ts:112, missions.ts:176, your-team.ts:131, the-brain.ts:178, integrations.ts:163}`
- `apps/website/src/app/vibey-pitch/{PitchDeckV1.tsx:142,405, pitch-slides-intro.tsx:34, extrapages.tsx:42}`

Two eval datasets also still name it as their project: `apps/agent-api/src/modules/brain/evals/datasets/foundry-yc-demo-space-baseline.md:5` and `foundry-yc-demo-baseline.md:5`. Notably, `scripts/seed-yc-demo/README.md:25` instructs the reader to `export SUPABASE_URL=https://qfrvykscoymiwwgysvsr.supabase.co` — documentation that contradicts the repo's own hard stop.

**MEDIUM — brand-era drift in shipped strings.** 19 hardcoded `https://app.vibey.im/login`, 8 `https://vibey.im`, 6 `https://vibey.so`, 3 `https://x.com/usevibey`, 3 `https://www.linkedin.com/company/usevibey`, 3 `https://www.instagram.com/vibey.im/` alongside 9 `https://app.roas.io`. `scripts/roas/verify-no-legacy-runtime-refs.sh:7` exists specifically to catch `govibey.com|vibey.im|vibeyfunnels.com`, so these are known and being policed — but they are still in source.

**MEDIUM — versioned directory naming.** `apps/web/src/components/home-dashboard-v4/` sits alongside `apps/web/src/features/home/`; `HomeDashboardV4Composer.tsx` is the single worst inverted-import file in the repo (16 imports back into `@/features/*`). No `v1`–`v3` remain, so the name is now pure archaeology.

**LOW — one explicit legacy shim.** `apps/web/src/features/spaces/components/chat/strip-legacy-spaces-conversation-title.ts`. Named honestly, contained, single purpose.

---

## Duplicate Implementations

Method: md5 over 8,765 non-`dist`, non-`.d.ts` `.ts`/`.tsx` files outside `apps/openclaw`. **15 byte-identical groups, 34 files, 13 groups spanning more than one workspace.** Full table in `07-dependency-map.md`.

**HIGH — infrastructure code copied because of a missing workspace dependency.** `apps/queue-worker/package.json` declares **zero** internal deps, so it re-implements what `@vibey/api-shared` already provides:

- `supabase-resilient-fetch.ts` exists **three** times: `packages/api-shared/src/services/` (99 lines) and `apps/{mission-worker,queue-worker}/src/lib/services/` (81 lines each, byte-identical to each other). This is the Supabase retry/resilience layer — three copies means a retry-semantics fix lands in one runtime.
- `database.module.ts` duplicated byte-for-byte in `apps/mission-worker/src/lib/` and `apps/queue-worker/src/lib/` (17 lines).
- `normalize-slack-timestamp.ts` duplicated in `apps/queue-worker/src/modules/slack-sync/utils/` and `apps/api/src/modules/slack/utils/` (9 lines).

**HIGH — two brain services duplicated byte-for-byte between backends.** `brain-sufficiency.service.ts` (221 lines) and `link-extraction.service.ts` (179 lines) are identical in `apps/api/src/modules/brain/services/` and `apps/agent-api/src/modules/brain/services/`. Both apps already depend on `@vibey/api-shared`, so there is no structural excuse. 400 lines of Brain logic that can silently diverge across two deployed services.

**HIGH — the paired studio chat stores have already diverged.** `apps/web/src/features/studio/store/` holds 6 chat stores in `funnel-*`/`presentation-*` pairs. Verified by normalising `funnel`→`X`, `presentation`→`X` and diffing:

| Pair                                                                            | Lines     | Differing lines after normalisation |
| ------------------------------------------------------------------------------- | --------- | ----------------------------------- |
| `use-funnel-tweaks-chat-store.ts` / `use-presentation-tweaks-chat-store.ts`     | 65 / 53   | **18**                              |
| `use-funnel-full-mode-store.ts` / `use-presentation-full-mode-store.ts`         | 99 / 109  | 46                                  |
| `use-funnel-design-chat-store.ts` / `use-presentation-design-chat-store.ts`     | 330 / 258 | 168                                 |
| `use-funnel-comments-chat-store.ts` / `use-presentation-comments-chat-store.ts` | 120 / 288 | 312                                 |

All four pairs expose the same contract (`session`, `registerSession`, `clearSession`, `set<X>ChatActive`, `setBundle`). The `comments` pair is the concrete failure: the presentation version gained `loadComments`, `retryPendingComments`, and a `writeOutbox` durability path that the funnel version never received. A user commenting on a funnel gets no outbox retry; the same action on a presentation does.

**MEDIUM — `cn()` exists four times** (7 lines each, byte-identical): `packages/ui/src/utils.ts`, `apps/funnels/src/lib/utils.ts`, `apps/admin/src/lib/utils/cn.ts`, `apps/website/src/lib/utils.ts`. The one package whose purpose is to hold it has zero importers.

**MEDIUM — the esbuild preview runner is triplicated.** `esbuild-transform.ts` and `use-esbuild-runner.ts` (36 lines each) are byte-identical across `apps/web`, `apps/admin`, and `apps/funnels` — six files, one implementation.

**MEDIUM — duplicated `format*` helpers with independent implementations.** Same exported name, different code:

| Function             | Copies | Locations                                                                                                                                                                                                                                                                                           |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatRelativeTime` | 4      | `features/spaces/components/contacts/ContactCommunicationPanel.helpers.ts:20`, `features/spaces/components/artifacts/form/form-responses-display.tsx:4`, `features/spaces/components/task-detail/task-activity-format.ts:228`, `features/mission-control/components/dialogs/detail-helpers.tsx:179` |
| `formatDate`         | 4      | `features/studio/components/preview/media/media-tab.utils.ts:3`, `features/brain/components/node-detail-formatters.ts:3`, `features/settings/.../billing-page/utils/billing-format.ts:5`, `components/media/drive-file-browser-modal.utils.tsx:37`                                                  |
| `formatLongDate`     | 2      | both in `features/team-2/components/teams/` — `team-overview-utils.ts:132`, `team-analytics-formatting.ts:26`                                                                                                                                                                                       |
| `formatMeetingTime`  | 2      | both in `features/brain/components/` — `user-add-info-panel/utils.ts:18`, `training/training-staging-helpers.ts:209`                                                                                                                                                                                |
| `formatTokenK`       | 2      | `lib/chat/composer-model-picker.ts:9`, `features/studio/components/ChatInput/chat-input-format.ts:1`                                                                                                                                                                                                |
| `formatSkillName`    | 2      | `lib/agents/agent-display.ts:1`, `features/team/constants/team.constants.ts:10` — and `settings` imports the `team` copy across a feature boundary rather than the `lib` one                                                                                                                        |

Two of these (`formatLongDate`, `formatMeetingTime`) are duplicated _within the same feature directory_, meaning the author did not find the existing helper two folders away.

**MEDIUM — the agent action surface is described twice by hand.** `apps/agent-api/.../artifacts/services/artifact-action-schemas.ts` (4,460 lines, machine-enforced) and `apps/agent-api/.../agent-sync/data/vibey-api-action-docs.ts` (2,765 lines, prose for the model) must be kept in sync manually. They are the #1 and #2 most-cited files in `.docs/plans/agent-follow-up-work.md` (118 and 102 mentions).

**LOW — 4 trivial 1–2 line duplicates**: `instrumentation.ts` (`apps/web`/`apps/website`), `instrument.ts` (`apps/api`/`apps/mission-worker`), `instrumentation-client.ts` (`apps/web`/`apps/website`), `supabase/client.ts` (`apps/web`/`apps/admin`). Expected boilerplate.

---

## Temporary Scripts

**MEDIUM — 144 script files under `scripts/`**, with an explicitly-named `one-off/` directory that was committed rather than discarded:

`scripts/seed-yc-demo/one-off/` — 8 files: `backfill-embeddings.ts`, `fix-space-task-views.ts`, `seed-agent-conversations.ts`, `seed-almanac-analytics.ts`, `seed-client-demo-sequences.ts`, `seed-ig-research.ts`, `seed-plinthworks-webinar-sequence.ts`, `sync-demo-user-auth-metadata.ts`.

These are named after single historical events (`plinthworks`, `almanac`) and write to a database. They are indistinguishable from live tooling to anyone browsing the tree.

**MEDIUM — `scripts/seed-yc-demo/` is 37,232 lines across 73 files.** It contains the single largest file in the repository, `scripts/seed-yc-demo/content/narrative-pages.ts` (5,578 lines), which is one export of static demo prose. This is a demo fixture tree the size of a mid-sized application, versioned alongside production code. Its `README.md:25` also documents pointing at the forbidden legacy Supabase project (see Legacy Code).

**MEDIUM — 6 `generate-*-migration` scripts sit at `scripts/` top level**: `generate-ad-creative-skills-migration.mjs`, `generate-agency-roas-template-migration.ts`, `generate-roas-ad-skills-migration.ts`, `generate-space-automation-templates-migration.mjs`, `generate-space-templates-migration.mjs`, `generate-strategist-skills-migration.ts`, `generate-webinar-pipeline-skills-migration.ts`. Each generated a migration once; the migration is now the artifact of record (see `06-database-map.md`), leaving the generators as write-capable scripts with no remaining job.

**MEDIUM — 5 `seed-*` scripts** (`seed-system-agents.ts`, `seed-roas-ad-skills.ts`, `seed-strategist-skills.ts`, `seed-webinar-pipeline-skills.ts`, `seed-agency-automation-templates.ts`) and **6 `backfill-*`/`repair-*`/`fix-*` scripts** in `scripts/roas/` (`backfill-campaign-brain-embeddings.py`, `backfill-page-grader-campaign-knowledge.py`, `backfill-campaign-ads-knowledge.py`, `backfill-fathom-campaign-brains.mjs`, `repair-page-grader-campaign-knowledge-graph.py`, `fix-mission-worker-railway-root.sh`). None are marked idempotent or dated in their filenames.

**LOW — `scripts/modal-spike.ts`** is named as a spike and still present.

**LOW, and good** — `scripts/roas/deploy-railway-workers.sh` is explicitly flagged in `CLAUDE.md` as a sensitive helper that prints secrets and must never be run by agents. The hazard is documented rather than hidden.

---

## Debug Code

This is the most pleasant surprise in the audit. For a repo described as vibe-coded, the debug-residue markers are near-zero.

**LOW — 32 `console.log`/`console.debug`/`console.info` calls in 17 non-test files** across all first-party apps. Worst offenders are modest and mostly justified:

| Count  | File                                                                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7      | `apps/chrome-extension/src/background/auth.ts`                                                                                                                                                                                           |
| 4      | `apps/web/src/features/studio/components/preview/SandpackPreview.tsx`                                                                                                                                                                    |
| 3      | `apps/web/src/app/api/proxy/[...path]/route.ts`                                                                                                                                                                                          |
| 2 each | `packages/api-shared/src/services/supabase-resilient-fetch.ts`, `apps/{queue,mission}-worker/src/lib/services/supabase-resilient-fetch.ts` (the three duplicates), `apps/agent-api/.../evals/user-work/user-work-yc-demo-real-runner.ts` |
| 1 each | `OfferPreview.tsx`, `AvatarPreview.tsx`, `ProjectAgentsPanel.tsx`, `app/api/freeze-debug/route.ts`, `vibey-mcp-smoke-runner.ts`                                                                                                          |

Total `console.*` including `warn`/`error` is 238 — i.e. the overwhelming majority of console usage is intentional error/warn logging, not stray debugging.

**LOW — 3 `TODO` markers total. Zero `FIXME`, `HACK`, or `XXX`.** Across ~1.4M lines. This is unusual and reflects the `.docs/plans/agent-follow-up-work.md` convention: debt is logged in one file (2,944 entries) instead of scattered as inline comments.

**LOW — 1 `@ts-ignore`, 0 `@ts-expect-error`, 0 `@ts-nocheck`.**

**LOW — 19 `eslint-disable` directives in 8 files.**

**LOW / correctly built — the `freeze-debug` surface is production telemetry, not leftovers.** `apps/web/src/app/api/freeze-debug/route.ts` (66 lines) requires an authenticated user via `supabase.auth.getUser()`, rejects bodies over `MAX_BODY_BYTES = 5000` with a 413, and sanitises input through `sanitizePayload`/`sanitizeValue` with explicit caps (`MAX_CONTEXT_FIELDS = 48`, `MAX_KEY_LENGTH = 64`, `MAX_STRING_LENGTH = 500`). It is wired in through `apps/web/src/app/(dashboard)/providers.tsx` and `lib/api/backend-client.ts`. `apps/web/src/lib/debug/freeze-diagnostics.ts` (207 lines) does hold 5 module-level `let` singletons, the highest count in `apps/web` — acceptable for a diagnostics buffer, but it is per-process mutable state.

---

## Hardcoded Values

**HIGH — 9 committed pre-signed Supabase storage URLs with tokens valid to 2090.** In `apps/website/src/lib/agent-library-fallback.ts`, `marketing-hr-showcase-data.ts:20`, `feature-pages-content/*.ts`, and `app/vibey-pitch/*`. Each embeds a JWT-style `?token=` query string whose decoded payload contains `"exp": 2090316099`-class values — roughly 64-year lifetimes. They also point at the forbidden legacy project (see Legacy Code) and cannot be rotated without a code change and redeploy. Detail deferred to `08-auth-security.md`.

**HIGH — 98 hardcoded UUID literals in non-test source.** The most concerning are not the 25 all-zeros sentinels (`00000000-0000-0000-0000-000000000000`, used as a placeholder org/media path) but the 10 occurrences of a single real-looking id, `94e24cc9-0e93-41a4-9d43-69640004018c`, plus `784b8ea0-…` (2), `7614ea8a-…` (2), and ~20 further one-off ids. A tenant or record id compiled into source is a cross-tenant hazard the moment the code runs against a different environment. See `06-database-map.md` for the multi-tenancy model these must respect.

**MEDIUM — ~54 hardcoded `localhost` URLs in non-test source**: `http://localhost:3001` (31), `:3000` (12), `:3003` (11), `:18789` (7), `:54321` (4), plus `:3200`, `:3011`, `:1455`, `:4000`. `11-configuration.md` documents the intended env-var precedence; these are the inline fallbacks that bypass it. The port list matches the documented app map (`api` 3001, `web` 3000, `agent-api` 3003, `openclaw` 18789), so they are development defaults rather than mistakes — but they are compiled in.

**MEDIUM — third-party API endpoints inline rather than configured**: `https://generativelanguage.googleapis.com/v1beta/models/` (10, including a pinned `gemini-3.5-flash` path, 5×) and `https://openrouter.ai/api/v1/chat/completions` (5). Pinning a model name in a URL string means a model migration is a code change. See `09-integrations.md`.

**MEDIUM — `dylan@dylanvanas.com` appears 5 times in non-test source.** A real personal address compiled into the product. The other high-count emails are clearly placeholders (`you@domain.com` 9, `email@example.com` 5, `alex@company.com` 5, `sefy@example.com` 3) and are fine as sample copy.

**MEDIUM — Google Drive/Docs deep-link prefixes hardcoded**: `https://docs.google.com/document/d/` (10), `https://drive.google.com/file/d/` (5). Also 4 hardcoded OAuth scope URLs (`.../auth/admin.directory.user.readonly`, `.../auth/calendar.readonly`) — scopes belong in integration config, not scattered in call sites.

**LOW — 5 hardcoded `images.unsplash.com` photo URLs** as placeholder imagery, and `https://example.com` (10), `https://yourdomain.com` (3) as documented placeholders.

---

## Commented-Out Code

**LOW — 20 lines total** matching commented-out code patterns (`// const`, `// let`, `// function`, `// return`, `// import`, `// export`, `// if (`, `// await`, `// console.`) across `apps/web/src`, `apps/api/src`, and `apps/agent-api/src` non-test files.

For a 1.4M-line codebase this is effectively zero. The 3,006 block comments (`/* …`) are overwhelmingly JSDoc — for example `artifact-action-schemas.ts:1–8` and its inline field documentation at lines 35–40. **No action needed.** Whatever else happened here, dead code was deleted rather than commented out, which is the behaviour `AGENTS.md §2` ("Replace, don't accumulate") asks for.

---

## Unused Dependencies

**LOW — zero unused runtime dependencies found.** Every declared `dependencies` entry in 10 audited workspaces is referenced by at least one file in that workspace:

| Workspace             | Runtime deps | Files scanned | Never referenced |
| --------------------- | ------------ | ------------- | ---------------- |
| `apps/web`            | 81           | 4,886         | 0                |
| `apps/api`            | 40           | 2,194         | 0                |
| `apps/agent-api`      | 48           | 964           | 0                |
| `apps/admin`          | 46           | 123           | 0                |
| `apps/website`        | 23           | 225           | 0                |
| `apps/mission-worker` | 19           | 202           | 0                |
| `apps/queue-worker`   | 17           | 64            | 0                |
| `packages/api-shared` | 7            | 132           | 0                |
| `packages/ui`         | 2            | 4             | 0                |
| `packages/db`         | 1            | 5             | 0                |

Method: walk each workspace (skipping `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, dotfiles), concatenate all `.ts/.tsx/.js/.jsx/.mjs/.cjs/.json`, and check for a quoted import of the package name or a subpath. `npx depcheck` was not used — on a tree this size it is slow and its false-positive rate on Next.js/NestJS config-driven deps would have required manual review of every hit anyway. The heuristic above can produce false _negatives_ (a name mentioned in a comment counts as used), so read this as "no obvious unused deps", not a proof.

**MEDIUM — the real dependency problem is duplication, not disuse.** `apps/admin` declares 46 runtime deps for only 123 files, including a full TipTap editor stack (23 `@tiptap/*` packages) that mirrors `apps/web`'s. `apps/web` and `apps/admin` also each carry `three`, `animejs`, `framer-motion`, `react-runner`, `esbuild-wasm`, and `emoji-picker-react`. Every one is "used", so no tool flags it — but two apps are independently maintaining the same rich-text and 3D stacks.

---

## Inconsistent Patterns

**HIGH — validation is opt-in on `apps/api`, which `AGENTS.md §8.5` explicitly forbids.** `apps/agent-api/src/main.ts:113–114` installs a global `app.useGlobalPipes(new ValidationPipe({…}))`. `apps/api/src/main.ts` installs **only** `app.useGlobalFilters(exceptionFilter)` at line 86 — there is no global pipe. Validation in `apps/api` therefore depends on each route remembering to annotate: **88 of 336 controllers (26%) import a DTO**, against 82 `*.dto.ts` files. `ZodValidationPipe` is applied 753 times across 118 files, so the discipline is real where present — but the default is pass-through. `AGENTS.md §8.5` states "No agent-facing action may rely on opt-in/pass-through validation."

**HIGH — two mutually incompatible strategies for the same problem (files that are too big).** Strategy A, in `apps/web`: leave the file large and add it to `scripts/arch/loc-allowlist.json` (145 entries). Strategy B, in `apps/api`: split into numbered `*-NN.base.ts` abstract classes that the gate does not classify at all (10 chains, 66 files, 32,508 lines — `space-automation` is 19 links deep). Both "pass". Neither reduces complexity, and Strategy B additionally manufactures the deepest circular dependencies in the repo. Full analysis in `07-dependency-map.md`.

**HIGH — the standard fix for a large file creates a cycle.** 52 circular dependencies, and the recurring shape is "extract a sibling helper, then have the helper import the parent back": `integrations-calendar.service.ts` ↔ its 5 extracted helpers, `chat-stream-execution.service.ts` ↔ its 3 executors, `artifact-action-preflight.ts` ↔ its 3 specialised preflights. The LOC gate rewards the extraction and nothing penalises the back-edge.

**MEDIUM — no server-state library, so caching is re-invented per feature.** `apps/web` has 25 Zustand stores and no react-query/SWR. The consequence is 392 module-level `Map`/`Set`/`WeakMap` caches across `apps/web`/`apps/api`/`apps/agent-api`, 60 module-scope `let` singletons in `apps/web`, and bespoke cache hooks like `features/spaces/hooks/use-cached-spaces.ts`. Each store carries its own invalidation rules, so "stale data" is a per-feature bug class rather than a solved problem.

**MEDIUM — cross-component coordination via `globalThis`.** 20 non-test occurrences, 13 of them in one directory: `features/studio/components/ChatInput/` (`use-chat-input-dropzone.ts` 8, `use-chat-input-external-attachments.ts` 2, plus `-global-shortcuts`, `-context-popover`, `chat-input-file-state.ts`). Plus `lib/api/backend-client.ts` (2). Sibling components in the same folder communicating through the global object instead of context or a store.

**MEDIUM — the shared layer has become a second feature layer.** `apps/web/src/components/` contains directories named after features (`spaces/`, `chat/`, `flows/`, `contacts/`, `notifications/`, `missions/`, `channels/`, `artifacts/`, `presentations/`, `work-views/`, `home-dashboard-v4/`), producing 257 imports from `components|lib|hooks` back into `@/features/*`. The clearest single symptom: `apps/web/src/components/ui/forms/rich-text-toolbar.tsx` — a generic UI primitive — imports `@/features/spaces/components/cells`.

**MEDIUM — `.base.ts`, `.workflow.ts`, `.policy.ts`, `.gateway.ts`, `.processor.ts`, `.loader.ts`, `.util.ts`, `.registry.ts` suffixes all exist** with no gate coverage and no documented meaning, alongside the four suffixes the architecture actually enforces (`.controller.ts`, `.service.ts`, `.repository.ts`, `.dto.ts`).

**LOW — one malformed allowlist entry.** `scripts/arch/loc-allowlist.json` records `apps/api/src/modules/work-requests/services/work-request.service.ts` as `{"lines": 601}` with no `kind` or `limit`, unlike the other 144 entries. It is also a current gate failure.

---

## Large Files

**CRITICAL — 146 files exceed their architecture-gate limit; 43 exceed 2×; 19 exceed 3×.** Out of 3,545 files the gate classifies. Baseline debt is 145 files carrying **54,437 excess lines** (116,637 total lines in over-limit files). Distribution: `apps/web` 115, `apps/api` 14, `apps/agent-api` 10, `apps/mission-worker` 4, `apps/queue-worker` 2; by kind, `web-component` 107, `service` 23, `repository` 6, `controller` 4, `web-container` 4.

The worst offenders, with what they actually mix (full 15-row analysis in `07-dependency-map.md`):

| Lines / limit | File                                                                    | Real problem                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 2,993 / 600   | `apps/web/src/features/studio/services/chat.service.ts`                 | Timeline replay + 5 block-merge functions + stream-error interpretation + prewarm cache with its own scheduler + status copy + 3 module `let`s |
| 2,664 / 400   | `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`  | **One component: 35 `useEffect`, 35 `useCallback`, 21 `useMemo`, 13 `useState`, 13 `useRef`** + 17 cross-feature imports                       |
| 2,447 / 400   | `apps/web/src/features/spaces/components/DocsView.tsx`                  | **23 components in one file** + Google Drive bucketing/grouping + thumbnail URL rewriting + DnD tree                                           |
| 2,259 / 600   | `apps/mission-worker/.../phases/mission-execute-phase.service.ts`       | Whole mission-execution phase                                                                                                                  |
| 2,252 / 400   | `apps/web/src/components/ui/forms/rich-text-toolbar.tsx`                | UI primitive + TipTap document-style engine + `useReducer` + a feature import                                                                  |
| 2,121 / 400   | `apps/web/src/features/spaces/components/automations/ActionBuilder.tsx` | ~2,000 lines of inline JSX branching, only 4 hooks — zero sub-component extraction                                                             |
| 2,110 / 600   | `apps/web/src/features/flows/containers/FlowsPage.tsx`                  | 35 `useCallback` + 27 `useEffect` + 26 `useMemo` + 28 top-level declarations                                                                   |

**CRITICAL — 32,508 lines are exempt from the gate by file naming.** The 10 `*-NN.base.ts` chains (see Inconsistent Patterns). `space-automation.service.ts` is a 530-line file resting on 19 abstract bases totalling 11,395 lines, and it passes a 600-line limit.

**HIGH — the largest gate-invisible individual files:**

| Lines | File                                                               | Why unlimited                                    |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 5,578 | `scripts/seed-yc-demo/content/narrative-pages.ts`                  | outside `apps/`; static demo data (low risk)     |
| 4,731 | `apps/website/src/app/vibey-pitch/PitchDeckV1.tsx`                 | `.tsx` outside `apps/web`                        |
| 4,461 | `apps/agent-api/.../artifacts/services/artifact-action-schemas.ts` | not `*.service.ts`                               |
| 3,839 | `apps/mission-worker/.../brain-ops/brain-ops.processor.ts`         | `*.processor.ts`                                 |
| 2,766 | `apps/agent-api/.../agent-sync/data/vibey-api-action-docs.ts`      | plain `.ts`                                      |
| 2,489 | `apps/mission-worker/.../gateways/mission-openclaw.gateway.ts`     | `*.gateway.ts`                                   |
| 2,475 | `apps/web/src/features/studio/store/use-chat-store.ts`             | `.ts`, not `.tsx` — **and imported by 56 files** |
| 1,438 | `apps/agent-api/.../artifact-capability.policy.ts`                 | `*.policy.ts`                                    |
| 1,308 | `apps/web/src/app/api/proxy/[...path]/route.ts`                    | route handlers                                   |
| 1,046 | `apps/api/.../meeting-follow-up-slack-confirm.workflow.ts`         | `*.workflow.ts`                                  |

**Verified against `.docs/plans/agent-follow-up-work.md`.** The log (40,325 lines, 2,944 entries) is accurate, not aspirational. Its final entry claims `useSidebarController.ts` is 815 lines and `SidebarHqFlyouts.tsx`/`SidebarSimpleSection.tsx`/`SidebarHqHubMenuContent.tsx` are 381/376/342 — measured: **815, 381, 376, 342. Exact.** Recurring themes by keyword: `LOC` 5,852 mentions, `deferred` 2,242, `cross-feature` 227, `duplicate` 192, `out of scope` 135, `exceeds` 53, `RLS` 35, `hardcoded` 12. Most-cited files: `vibey-api-action-docs.ts` (118), `artifact-action-schemas.ts` (102), `agent-api chat.service.ts` (73), `web chat.service.ts` (61).

---

## Circular Dependencies

**HIGH — 52 cycles.** Tool: `npx --yes madge --circular --extensions ts,tsx --ts-config <app>/tsconfig.json <app>/src`, run on the three main apps (nothing installed permanently). `apps/openclaw`, `apps/website`, `apps/admin`, `apps/funnels`, and the workers were **not** scanned — the real total is higher.

| App              | Cycles | Files scanned |
| ---------------- | ------ | ------------- |
| `apps/api`       | 30     | 2,271         |
| `apps/agent-api` | 13     | 1,003         |
| `apps/web`       | 9      | 4,864         |

**HIGH — 3 NestJS _module_-level cycles in `apps/api`**, the riskiest of the set because they can yield undefined DI providers at boot: `brain.module.ts` ↔ `space-retrieval.module.ts`, `spaces.module.ts` ↔ `integrations/cursor/cursor.module.ts`, and `spaces.module.ts` → `slack.module.ts` → `leads.module.ts`.

**HIGH — 9 service↔repository inversions**, where the repository imports the service it exists to serve: `vault.service ↔ vault.repository`, `brain-permissions.service ↔ brain-permissions.repository`, `feature-updates.service ↔ feature-updates.repository`, `leads/contact-identifier.service ↔ contact-identifier.repository`, `channels.repository ↔ channel-memberships.repository`, `meeting-workspace-resolution.repository ↔ create-scheduled-meeting-item.ts`, `browser-sessions` (in **both** `apps/api` and `apps/agent-api`), `public-agent.repository ↔ public-agent.service`, `chat-runtime.repository ↔ message-timeline.service`. Each is a 2-node cycle and independently fixable.

**MEDIUM — 8 of the 30 `apps/api` cycles are one deep cycle re-reported at increasing depth**, rooted in the `.base.ts` chain: `space-automation.service` → `meeting-follow-up-slack-confirm.service` → `.workflow` → `meeting-follow-up-name-knowledge.loader` → `page-grader-api.service` → `page-grader-send-work.service` → `spaces.service` → `spaces-service-07.base` → … → `-01.base`. A 7-hop `spaces → integrations → spaces` cycle that then walks all 7 inheritance links.

**MEDIUM — 6 of the 13 `apps/agent-api` cycles are in the artifact schema/preflight cluster**: `artifact-action-schemas.ts` ↔ `artifact-action-additional-schemas.ts` (± `-meta-schemas.ts`), `artifact-action-schemas.ts` ↔ `artifact-space-item-field-contract.ts`, and `artifact-action-preflight.ts` ↔ `artifact-mcp-tool-preflight` / `artifact-presentation-action-preflight` / `artifact-webinar-launch-bible-preflight`. This is the agent validation path (`AGENTS.md §8.5`), so boot-order fragility here affects every agent action.

**LOW / notable positive — all 9 `apps/web` cycles are intra-feature and 2–3 nodes.** Despite 437 cross-feature imports, **no cycle crosses a feature boundary in `apps/web`.** 4 of the 9 are `team-2` toolbar↔popover pairs; 2 are controller-hook pairs; the rest are view-model↔search and editor↔menu pairs. Small, local, individually trivial to break.

---

## Missing Error Handling

**HIGH — errors are swallowed at scale.** Against 3,895 total `catch` occurrences in non-test first-party source:

| Pattern                                                                 | Count     |
| ----------------------------------------------------------------------- | --------- |
| `catch {}` / `catch (e) {}` — completely empty                          | **82**    |
| `catch (…) { // comment only }` — comment, no handling                  | **480**   |
| `.catch(() => {})` / `→ undefined` / `→ null` — no-op rejection handler | **376**   |
| `.catch(arg => {})` variants                                            | 172       |
| `void <promise>` — fire-and-forget at statement start                   | **1,548** |

That is roughly **14% of all catch blocks completely empty, and a further ~12% comment-only** — over a quarter of error handling in the repo discards the error without recording it.

Worst empty-catch files:

| Count  | File                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10     | `apps/web/src/components/ui/media/simple-chat-audio-recorder.tsx`                                                                                                                                                                                                                                                         |
| 5      | `apps/web/src/lib/utils/clear-org-state.ts`                                                                                                                                                                                                                                                                               |
| 5      | `apps/mission-worker/src/modules/missions/services/utils/mission-json.service.ts`                                                                                                                                                                                                                                         |
| 5      | `apps/api/src/modules/team-roster/services/team-roster-slack-json-parser.ts`                                                                                                                                                                                                                                              |
| 3      | `apps/web/src/app/(auth)/join/page.tsx`                                                                                                                                                                                                                                                                                   |
| 2 each | `lib/agents/use-team-container-roster.ts`, `features/spaces/.../ReportingCustomizePanel.tsx`, `features/impersonation/components/ImpersonationBanner.tsx`, `features/brain/hooks/use-brain-queue.ts`, `features/brain/hooks/use-brain-live-session.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/invite/[token]/page.tsx` |

Two clusters deserve individual attention:

- **CRITICAL — `apps/web/src/lib/utils/clear-org-state.ts` has 5 empty catches.** This is tenant-state teardown. A silent failure here leaves one organisation's cached state in place while the user believes they have switched — a cross-tenant _display_ hazard. See `08-auth-security.md` and the multi-tenancy model in `06-database-map.md`.
- **HIGH — auth pages swallow errors.** `app/(auth)/login/page.tsx` (2), `app/(auth)/join/page.tsx` (3), `app/(auth)/invite/[token]/page.tsx` (2). A failed sign-in or invite acceptance that throws produces no signal to user or telemetry.

**MEDIUM — 1,548 `void`-prefixed fire-and-forget calls.** This is a deliberate, consistent convention (it satisfies `no-floating-promises` rather than dodging it), and in a streaming/agent UI much of it is legitimate. But at this volume, any `void`-ed call that fails is invisible: no retry, no log, no user-facing state. There is no distinction in the codebase between "fire-and-forget because failure is acceptable" and "fire-and-forget because nobody thought about it".

**Context — this coexists with genuinely excellent error infrastructure.** `AGENTS.md §8.6` mandates a structured tool-error contract (`error_code`, `error_class`, `effect_state`, `retry_policy`, `correction`, `agent_instruction`, `user_explanation`, `observability.fingerprint`) plus workflow circuit breakers, and `packages/api-shared/src/filters/global-exception.filter.ts` is installed globally in `apps/api` (`main.ts:86`). The problem is not absence of a strategy; it is that the _agent-facing_ path is rigorous while the ordinary frontend/utility path discards errors.

---

## Missing Validation

**HIGH — `apps/api` has no global `ValidationPipe`.** `apps/api/src/main.ts` installs only `app.useGlobalFilters(exceptionFilter)` (line 86). By contrast `apps/agent-api/src/main.ts:113–114` does install `app.useGlobalPipes(new ValidationPipe({…}))`. Consequence: in `apps/api`, a route without an explicit pipe accepts any body shape.

**HIGH — 248 of 336 `apps/api` controllers import no DTO.** 82 `*.dto.ts` files exist and 88 controllers import one (26%). Repo-wide, `ZodValidationPipe` is applied 753 times across 118 files, e.g. `apps/agent-api/.../artifacts.controller.ts:45,82` (`@Body(new ZodValidationPipe(ArtifactActionDto))`). So validation is well-implemented and heavily used — it is just not _mandatory_, which is precisely what `AGENTS.md §8.5` prohibits ("No agent-facing action may rely on opt-in/pass-through validation"). Many of the 248 are GET routes where a body DTO is irrelevant, so this is an upper bound, not 248 vulnerable endpoints. See `05-api-map.md` for the endpoint inventory.

**MEDIUM — zero of the 11 `apps/web` route handlers use zod.** `rg -l "from 'zod'" apps/web/src/app --glob 'route.ts'` → 0, across `api/{auth,chat,feature-updates,freeze-debug,ig-thumbnail,preview-docx,proxy,social-thumbnail,spaces,tsx-repair}`. Validation here is hand-rolled where it exists. `freeze-debug/route.ts` does it properly (explicit caps and a sanitiser); `api/proxy/[...path]/route.ts` is 1,308 lines and is the app's main backend passthrough — see `05-api-map.md` § The Proxy Layer.

**MEDIUM — 454 `as any` and 1,194 `: any` annotations in non-test source.** These are type-system opt-outs at exactly the boundaries where runtime validation is also missing. Given only 1 `@ts-ignore` in the whole repo, `any` is the escape hatch of choice.

**LOW — validation stack is consistent in kind.** Zero `class-validator` imports in `apps/api`/`apps/agent-api` despite it being a NestJS default; everything is zod (115 files import it). One library, not two.

---

## Security Concerns

Depth belongs in `08-auth-security.md`; recorded here only where a code-health scan surfaced something that document should confirm.

**HIGH — 9 long-lived pre-signed storage URLs committed to git.** `apps/website/src/lib/agent-library-fallback.ts` (9 URLs at lines 14–147), `marketing-hr-showcase-data.ts:20`, `feature-pages-content/{studio,skills,missions,your-team,the-brain,integrations}.ts`, `app/vibey-pitch/{PitchDeckV1.tsx:142,405, pitch-slides-intro.tsx:34, extrapages.tsx:42}`. Each carries a `?token=` whose decoded payload shows expiries around 2090. They cannot be rotated without a redeploy, they are in git history permanently, and they point at the **forbidden legacy project** `qfrvykscoymiwwgysvsr` rather than `lhfgtsjetcardinpgouq`.

**HIGH — 5 live violations of the `apps/web` direct-Supabase ban.** `eslint.config.mjs:120–139` forbids `supabase.from(` in `apps/web` outside `middleware.ts`, `app/(auth)/callback/route.ts`, `app/api/proxy/[...path]/route.ts`, and `lib/supabase/**`, requiring `backendGet/backendPost/backendPatch` instead. Still present:

- `features/brain/hooks/use-brain-scope-nav-options.ts:101` (`profiles`), `:141` (`brain_shares`), `:328` (`profiles`)
- `features/brain/services/recurring-rules.service.ts:206` (`agents_registry`)
- `features/settings/components/settings-content/BrainPageContent.tsx:75` (`agents_registry`) — **from a component**

These bypass the backend authorization chain described in `08-auth-security.md` and rely entirely on RLS. `brain_shares` is a permissions table, which makes that query the one to check first.

**MEDIUM — 14 non-auth components construct their own Supabase client.** Of 25 `.tsx` files calling `createClient()`, 11 are auth pages where it is correct. The rest are not: `components/layout/AvatarAccountMenuPanel.tsx:91`, `components/shell/ShellNewChatGreeting.tsx:40`, `components/flows/AutomationRunsLog.tsx:90`, `features/team-2/components/VibeyOpsDesk.tsx:43`, `features/settings/components/EnterpriseApplicationModal.tsx:35`, `features/work-requests/components/WorkRequestReviewPage.tsx:52`, and `features/settings/.../ProfilePageContent.tsx` at lines 45, 83, 111, 147 — four separate clients in one component.

**MEDIUM — 10 occurrences of one real-looking UUID (`94e24cc9-0e93-41a4-9d43-69640004018c`)** plus ~20 further one-off ids in non-test source. If any is an org or user id, the code behaves differently per environment in a way no test would catch.

**LOW / good — no secrets are tracked.** `git ls-files | rg "\.env"` returns only `*.env.example`, `*.env.local.example`, `roas-secrets.env.template`, `openclaw.podman.env`, and one test file. `.gitignore:16` ignores `.env`. `CLAUDE.md` additionally marks `scripts/roas/deploy-railway-workers.sh` as a secret-printing script agents must never run. Secret hygiene is genuinely handled — see `11-configuration.md`.

---

## Data Integrity Concerns

**CRITICAL — two user-profile tables are both live.** `from('profiles')` appears at **89** call sites and `from('user_profiles')` at **19** in the working tree. `apps/web/src/middleware.ts` queries **both on every dashboard request**. There is no evident source of truth, no documented migration direction, and no constraint tying the two. Any write to one is invisible to readers of the other. Full schema analysis in `06-database-map.md`; this document records only that the split is still live in code, not resolved.

**CRITICAL — `packages/api-shared/dist/` is committed and desynchronised from `src/`.** `.gitignore:11–12` ignores `dist/` then explicitly re-includes it (`!packages/api-shared/dist/`), so **294 dist files are tracked** against 140 `src` files. This is deliberate — but it means the _compiled artifact_ is a reviewed, merge-conflict-prone source file, and consumers resolving `@vibey/api-shared` (860 import sites) may get stale compiled output while typechecks read fresh `src`.

On the reported test failure (`programmaticTsxRepair is not a function`): the symbol **is** exported from both sides — `packages/api-shared/src/index.ts:138` and `packages/api-shared/dist/index.d.ts:53`, and it appears in `dist/index.js` and `dist/services/funnel-tsx-contract.js`. So this is not a missing export. **I could not determine the root cause without running the test suite, which was out of scope for this read-only audit.** The likely candidates are a stale `dist` compiled from a different `src` revision (the working tree currently shows `dist/index.js`, `dist/index.d.ts`, `dist/types/*`, and `tsconfig.build.tsbuildinfo` all modified-but-uncommitted) or a CJS/ESM interop mismatch in how the test resolves the package root. Either way, the committed-`dist` arrangement is what makes the failure possible.

**HIGH — the workers have no repository layer, so data access is unreviewable.** `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts` issues **63 direct `.from('...')` calls** from a single 3,839-line class with 44 async methods spanning 9 job types, including private methods that are repositories in all but name (`loadExistingAvatars`, `loadCustomerContactsLite`, `loadCustomerBrainMemoriesSince`, `loadDiscriminatorAxes`, `replaceCustomerAvatarMemberships`). It also owns outbox bookkeeping (`markOutboxDone`, `markOutboxFailed`) and counter mutations (`incrementPagesUpdatedCounter`, `bumpCustomerMemoryCounterAndMaybeEnqueue`). `missions/services/gateways/mission-openclaw.gateway.ts` adds 19 more direct calls. These jobs mutate Brain data for all tenants — see `10-background-processes.md`.

**HIGH — 45 `apps/api` files query the database outside a repository.** Worst: `missions/services/skill-catalog-organization.service.ts` (15 calls), `meetings/services/meeting-follow-up-review.service.ts` (14), `brain/services/page-grader-client-import.service.ts` (11), `spaces/services/meetings-precall-drive-agenda.service.ts` (10), `brain/services/page-grader-brain-package-ingest.service.ts` (10), plus `page-grader/services/{mcp-bootstrap,agency-task-sync,meeting-sync}.service.ts` (9, 9, 8).

**MEDIUM — generated build output tracked in git.** Confirmed with `git ls-files`: 294 `packages/api-shared/dist/*` files, 5 `tsconfig.tsbuildinfo` (`apps/{admin,docs,funnels,web,website}`), and 5 `next-env.d.ts` (same apps). `.tsbuildinfo` and `next-env.d.ts` are machine-specific and regenerate on every build, guaranteeing recurring spurious diffs — the current `git status` already shows `apps/admin/next-env.d.ts` and `packages/api-shared/tsconfig.build.tsbuildinfo` modified without an intentional edit.

**MEDIUM — 25 all-zero UUID sentinels** (`00000000-0000-0000-0000-000000000000`) used as placeholder org/media path segments, including inside the committed signed storage URLs. A sentinel that is a syntactically valid UUID will pass any format validation and can be written to a real column.

---

## What Is Actually Good

This repo is described as "vibe coded". Several parts of it are better engineered than the majority of hand-built codebases, and a refactor plan that ignores this will damage working systems.

**1. The architecture gate is real, enforced in two places, and it works.** `scripts/arch/check-loc.mjs` (429 lines) plus mirrored ESLint rules in `eslint.config.mjs` that read the _same_ allowlist, so the CLI and the editor agree. It supports `--staged` for pre-commit, and `checkAllowlistOnlyShrinks` (line 362) compares against `origin/main` so the baseline can only shrink. It fails _loudly_ — 25 violations right now, mostly single-digit line growth — which means the ratchet is catching drift within days. It even errors when a file drops below its limit and should be _removed_ from the allowlist (line 227). This is a genuinely well-designed debt ratchet. It has one significant blind spot (`.base.ts` and other unclassified suffixes), and closing it is a small edit.

**2. The controller boundary is spotless.** All **367** `*.controller.ts` files across `apps/api` and `apps/agent-api` have **zero** direct Supabase calls — every one of the 7 `.from(` matches is `Buffer.from`. The `controllerSupabaseFiles` allowlist is empty because there has never been anything to forgive. Only 4 controllers exceed 200 lines. In a repo this large that is remarkable discipline.

**3. The frontend service layer is actually used.** Raw `fetch('/api/...')` in `.tsx` files: **4 occurrences**. Only 17 `.tsx` files call `fetch(` at all, and **none of them live under a `components/` directory** — they are blob/media loads in preview panes. Everything else routes through `lib/api/backend-client.ts`. The commonly-predicted failure mode for a vibe-coded Next.js app simply did not happen here.

**4. Debug residue is near-zero.** 32 `console.log/debug/info` calls in 1.4M lines. **3 TODOs. Zero FIXME, HACK, or XXX. One `@ts-ignore`. 20 lines of commented-out code.** Dead code was deleted rather than commented out — exactly what `AGENTS.md §2` asks. Debt is centralised in `.docs/plans/agent-follow-up-work.md` instead of rotting inline.

**5. The follow-up debt log is honest.** 40,325 lines, 2,944 entries, each with `Evidence:` / `Needed work:` / `Reason not done now:`. I spot-checked its final entry's four line-count claims (815 / 381 / 376 / 342) and **all four were exact.** A debt log that can be trusted at face value is rarer than clean code.

**6. Structured agent tool errors and workflow circuit breakers.** `AGENTS.md §8.6` mandates `error_code`, `error_class`, `effect_state`, `retry_policy`, `correction`, `agent_instruction`, `user_explanation`, `forbidden_user_framing`, and `observability.fingerprint` on every agent-visible failure, routed through defined chokepoints, with circuit-breaking by tool name and payload fingerprint. Combined with `packages/api-shared/src/filters/global-exception.filter.ts` installed globally, the agent-facing error path is more rigorous than most production platforms.

**7. Validation is opt-in but genuinely well-built where applied.** 753 `ZodValidationPipe` applications across 118 files, 82 DTO files, one validation library (zod) rather than a zod/class-validator split. The gap is the missing global pipe in `apps/api`, not the quality of the validation code.

**8. Dependency hygiene is clean.** Zero unused runtime dependencies across 10 audited workspaces (81 in `apps/web`, 40 in `apps/api`, 48 in `apps/agent-api`, …). No secrets tracked in git — only `.env.example`/template files. `pnpm` version pinned. `CLAUDE.md` names the one script that prints secrets and forbids agents from running it.

**9. Guardrail scripts enforce the dangerous invariants in code, not just prose.** `scripts/roas/verify-no-legacy-runtime-refs.sh:7` greps for every legacy host pattern; `scripts/roas/verify-local-env-alignment.sh:13` and `scripts/import-user-brain/{index,backfill-embeddings}.ts` define `BLOCKED_HOSTS` to refuse the forbidden Supabase project at runtime; `scripts/roas/ingest-roas-brain-package.py:33` does the same. The "never use the legacy DB" rule is executable, which is why 23 of the 32 legacy references are guardrails rather than leaks.

**10. No cross-feature cycles in `apps/web`.** Despite 437 cross-feature imports and 257 inverted shared-layer imports, all 9 `apps/web` cycles are intra-feature and 2–3 nodes long. The coupling is bad, but it is _acyclic_ at the boundary that matters most — which means feature extraction is mechanically possible rather than requiring a rewrite.

**11. `freeze-debug` is a model of how to ship diagnostics.** Auth-gated via `supabase.auth.getUser()`, 413 on oversized bodies, and an explicit sanitiser with hard caps (`MAX_BODY_BYTES`, `MAX_CONTEXT_FIELDS`, `MAX_KEY_LENGTH`, `MAX_STRING_LENGTH`). Its name makes it look like leftover debug code; it is the opposite.
