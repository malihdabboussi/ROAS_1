# Changelog - July 22, 2026

## [2026-07-22 13:05] - [FIX]

What: Restored production Team Agenda after overwrite. Live `scope=team` had become identical to personal (`team_available` missing, 0 `workspace:` events). Root cause: `api.roas.io` aliased to `dpl_5J8MhPaPL8o1F2pwYfVY5q5aBX2P` (Codex promote of Page Grader inactive-campaign fix) which lacked Team Agenda, overwriting known-good `dpl_DB9P88YFBfxwihA5AVD4kD3VkzJi`. Instantly re-aliased DB9P88, then archive-deployed local HEAD (+ TS fix for `getTeamAgendaWithMine` loadPersonal scope) as `dpl_E1fW4NdW9BmDmHXuRchRf43AHhyU` → api.roas.io. Post-prove: team_available=true, 58 events / 35 workspace, Aaron/Bryce/Nefi labels present; personal≠team.
Why: Local main still diverged from origin; incomplete production promotes wipe archive-only Team Agenda.
Impact: Home → Team calendars work again. Until origin catches up, do not promote/git-deploy roas-api without Team Agenda (`scope===team` / `getTeamAgendaWithMine`).
Files: `integrations-calendar-team.service.ts` (scope type fix), Vercel `roas-api` Production `dpl_E1fW4NdW9BmDmHXuRchRf43AHhyU`

## [2026-07-22 13:00] - [DOCS]

What: Clarified Programs are grouping/rollup only — not a create-from hierarchy level. Updated plan + feature doc accordingly.
Why: Product intent is campaign buckets + All Tasks scope, not Program as a parent you create into.
Impact: Phase 2 UI should be section headers + move-to-program + rollup filters; no Program create-parent flows.
Files: `.docs/plans/programs-hierarchy-and-all-tasks.md`, `documentation/features/programs.md`

## [2026-07-22 12:55] - [FEATURE]

What: Added Programs (grouping above Campaigns) — `programs` table, `campaigns.program_id`, Nest CRUD `/api/programs`, org seed Clients + ROAS Ops, Page Grader campaign backfill into Clients; skipped personal-account program backfill.
Why: Need a ClickUp Space-level shell so ROAS org can group client campaigns vs ops without renaming campaigns/spaces.
Impact: After migration + API deploy, `GET /api/programs` returns Clients/ROAS Ops; `PATCH /api/campaigns/:id { program_id }` moves campaigns. Hub/sidebar/All Tasks UI still pending.
Files: `supabase/migrations/20260722130000_programs.sql`, `apps/api/src/modules/programs/**`, `campaigns-service-01.base.ts`, `app.module.ts`, `apps/web/src/lib/programs/**`, `campaign-api.ts`, `documentation/features/programs.md`, plan

## [2026-07-22 05:03] - [DOCS]

What: Added the production proof report for the full ads lifecycle, including two live Ads Research runs, visual evidence counts, the Blaze Meta audit, specific recommendations, launch-gate state, automated test results, production deployment, and the remaining client-owned launch inputs.
Why: The overnight ads lifecycle goal required a durable, evidence-backed handoff that distinguishes proven platform readiness from the intentionally unapproved Nick campaign launch.
Impact: Reviewers can trace the live mission and artifact IDs, confirm visual and voice-contract proof, and see exactly what must be supplied before the paused Meta build and activation gates can proceed.
Files: `.docs/evidence/ads-lifecycle-proof-2026-07-22.md`

## [2026-07-22 00:25] - [FEATURE]

What: Extended the shell top-right work-area collapse control (PanelRight) from Spaces-only to Team, Brain, Flows, and Artifacts. Collapsing hides the page surface and shows full chat; expanding restores the screen without remounting.
Why: Spaces already had this; the other primary workspace screens needed the same way to focus chat.
Impact: On Team/Brain/Flows/Artifacts, use the top-right collapse control like Spaces.
Files: `shell-route-policy.ts`, `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `shell-chat-breadcrumb.ts`, related unit tests

## [2026-07-22 00:46] - [FIX]

What: Expanded the mission intent ecology contract to preserve detailed deterministic playbook instructions and aligned worker normalization with the API limit.
Why: Ads Research playbooks generated valid, source-grounding instructions longer than the legacy 1,000-character cap, so the API rejected every plan-save attempt before execution.
Impact: Detailed Ads Research plans can now be saved without truncating their Meta, Brain, visual-evidence, and client-identity requirements.
Files: `apps/api/src/modules/missions/dto/mission-plan.dto.ts`, `apps/api/src/modules/missions/dto/__tests__/mission-dto-schemas.test.ts`, `apps/mission-worker/src/modules/missions/utils/normalize-intent.ts`, `apps/mission-worker/src/modules/missions/utils/normalize-intent.test.ts`

## [2026-07-22 01:18] - [FEATURE]

What: Added a dedicated Meta Ads Audit & Optimization playbook and Blaze skill, surfaced it in the Space playbook launcher, routed connected Composio Meta accounts when native token access is unavailable, and tightened Ads Research to require 12 unique saved visuals with one final document save.
Why: Ads Research could mislabel a Composio-connected account as disconnected, count duplicated search hits as visual proof, and leave a partial research Doc after a rewrite loop. The ads lifecycle also lacked a first-class human-gated optimization cycle.
Impact: Blaze can audit real objective-specific Meta evidence, recommend bounded actions, apply only explicitly approved changes, verify the next measurement window, and hand approved research into a safe paused-build launch workflow without enabling spend.
Files: `apps/mission-worker/src/modules/missions/playbooks/ads-research.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/meta-ads-audit.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/meta-ads-launch.playbook.ts`, `apps/api/src/modules/missions/services/webinar-fulfillment-team.service.ts`, `apps/web/src/features/spaces/components/StartPlaybookModal.tsx`, `apps/web/src/features/spaces/components/MissionsView.tsx`, `apps/web/src/features/spaces/components/playbooks/meta-ads-audit.ts`, `supabase/migrations/20260722011000_meta_ads_audit_skill.sql`, `documentation/features/missions.md`, and focused tests

## [2026-07-22 01:41] - [FIX]

What: Linked Ads Research snapshots created from mission subtask sessions to their parent mission.
Why: The research action only resolved mission context for mission session keys, while Blaze executes visual searches from subtask session keys, leaving every saved search with an empty `mission_ids` array and the visual report at zero.
Impact: New research runs retain their actual ad-library snapshots in the mission report so humans can verify the visual evidence Blaze used.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-research.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-research.service.test.ts`

## [2026-07-22 02:14] - [FIX]

What: Minted a short-lived user session for mission and subtask runtime calls into native Meta actions.
Why: Background Blaze tasks have no interactive chat token, so `check_meta_connection` failed before reaching the connected organization-level Meta integration even though valid server-side OAuth credentials existed.
Impact: Ads Research, Meta Ads Audit, and Meta Ads Launch can use the client's connected Meta account during mission execution without exposing or copying OAuth tokens.
Files: `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.test.ts`, `scripts/arch/loc-allowlist.json`, `documentation/features/missions.md`

## [2026-07-22 02:35] - [FIX]

What: Made Meta insight reporting periods and hierarchy IDs explicit across the hard schema, preflight, runtime action, generated agent docs, Ads Research, and Meta Audit skill.
Why: The live proof run successfully read campaign results but then reused Meta's numeric campaign ID as the ROAS `campaign_id`, triggering scope mismatches; `date_preset` was also accepted by the agent but ignored by the runtime.
Impact: Blaze now keeps workspace scope fixed, drills down with returned local row IDs, receives corrective preflight guidance for mixed IDs, and audits exact inclusive date ranges.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-meta-api.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-meta-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts`, generated Vibey API guidance and tests, Ads Research and Meta Ads Audit playbooks and tests, `supabase/migrations/20260722093500_meta_insights_id_contract.sql`, `documentation/features/missions.md`

## [2026-07-22 03:25] - [FIX]

What: Added a deterministic Ads Research output verifier that requires at least three mission-linked saved searches and 12 unique visual ad references before accepting the competitive-research document.
Why: A research subtask could find ads through an unsaved fallback integration and complete with a document even though the visual Ads Research report had no durable evidence to render.
Impact: Documents-only research runs now enter corrective execution with the exact missing-search or missing-visual count; successful runs are guaranteed to have renderable mission-linked evidence.
Files: `apps/mission-worker/src/modules/missions/playbooks/ads-research.playbook.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-visual-evidence-verifier.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-output-contract.types.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-deliverables.repository.ts`, focused tests, `documentation/features/missions.md`

## [2026-07-22 03:36] - [FIX]

What: Made a manager retry reset the selected subtask and all active downstream dependents, clear stale verification state, close any downstream human gate, and reopen an `awaiting_human` Mission for execution.
Why: Retrying completed Ads Research while its approval gate was open left the parent Mission in `awaiting_human`; the outbox repeatedly rejected the retry as nondispatchable, and downstream recommendations remained based on stale research.
Impact: Research corrections now rerun the affected recommendation and script chain before returning to human approval, with no manual Mission Control recovery.
Files: `apps/api/src/modules/missions/repositories/mission-internal.repository.ts`, `apps/api/src/modules/missions/services/mission-internal-manager-subtasks.base.ts`, `apps/api/src/modules/missions/services/__tests__/mission-manager-retry-cascade.test.ts`, `documentation/features/missions.md`

## [2026-07-22 03:53] - [FIX]

What: Added a deterministic finished-document check that rejects Ads Research recommendations and video scripts containing literal or encoded em dashes.
Why: The live production run loaded Dylan Super Voice and claimed compliance, but the recommendation Doc still contained 95 em dashes and the script Doc contained 44.
Impact: Client-facing Ads Research copy now remains in corrective execution until its final native Doc contains zero em dashes.
Files: `apps/mission-worker/src/modules/missions/playbooks/ads-research.playbook.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-document-content-verifier.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-deliverables.repository.ts`, focused tests, `documentation/features/missions.md`

## [2026-07-22 04:06] - [FIX]

What: Removed the failed contract action and stale partial output from a subtask checkpoint before its corrective execution while retaining completed research and read actions.
Why: A rejected Ads Research Doc was correctly detected, but the retry prompt still classified the invalid `save_document` call as completed and instructed Blaze not to replace it.
Impact: Contract corrections can now rewrite the rejected artifact and preserve valid upstream work instead of looping on an invalid deliverable.
Files: `apps/mission-worker/src/modules/missions/services/phases/mission-execute-helpers.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-execute-phase.service.ts`, focused tests, `documentation/features/missions.md`

## [2026-07-22 04:20] - [FIX]

What: Added hard no-em-dash output contracts to every Meta Ads Audit and Meta Ads Launch document and repeated the Dylan Super Voice requirement in each writing task.
Why: The live audit used correct Meta evidence but still saved client-facing reports with em dashes even though its skill claimed Dylan Super Voice compliance.
Impact: Audit context, account analysis, recommendations, optimization logs, closeouts, launch manifests, and paused-build reports now remain in corrective execution until they contain zero em dashes.
Files: `apps/mission-worker/src/modules/missions/playbooks/meta-ads-audit.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/meta-ads-launch.playbook.ts`, focused playbook tests, `documentation/features/missions.md`
## [2026-07-22 04:30] - [FIX]

What: Made contract-correction prompts explicitly reject the previously failed artifact and require a newly created, compliant deliverable.
Why: A live Meta audit correction reused its old document after the verifier rejected that document for em dashes.
Impact: Corrective mission runs now replace invalid output instead of citing it as completed work.
Files: `apps/mission-worker/src/modules/missions/services/phases/mission-execute-helpers.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-execute-helpers.test.ts`, `apps/mission-worker/src/modules/missions/services/phases/mission-execute-phase.service.ts`, `documentation/features/missions.md`
## [2026-07-22 04:53] - [FIX]

What: Bound mission document verification to the contracted title and mapped Space document IDs to their mission-deliverable wrappers while verifying the current Space document body.
Why: A live Meta audit recommendation task could pass against a different audit Doc while its mission-deliverable copy was stale.
Impact: Mission contracts now verify the exact user-visible document created for the current subtask.
Files: `apps/mission-worker/src/modules/missions/services/persistence/mission-deliverables.repository.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-deliverable-contract-evaluator.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-document-content-verifier.ts`, focused tests, `documentation/features/missions.md`

## [2026-07-22 11:50] - [FIX]

What: Fixed Brain home statuses stuck on "Loading" for fleets of Person Brains. Replaced per-brain `brain_legend_connection_counts` in `brain_home_health_batch` with a lightweight aggregate (applied to ROAS prod), reduced batch chunks to 10, and made BrainHome clear loading + toast on health batch failure instead of hanging forever.
Why: `/api/brain/health/batch` was 5xxing under ~20+ brains (legend RPC timeout); the UI had no catch/finally so STATUS stayed "Loading".
Impact: Brain list can show real status/memory counts again after hard refresh (DB fix is live). Client resilience ships with the next web deploy.
Files: `20260722115000_brain_home_health_batch_lite.sql`, `BrainHome.tsx`, `brain.service.ts`, `memory-stats.repository.ts`, `brain-toast-errors.config.ts`, `BrainHome.test.tsx`, `scripts/roas/migration-order.txt`

## [2026-07-22 11:57] - [FIX]

What: Loaded every paginated workspace into the Campaigns page and preserved the selected workspace ID when opening from a campaign overview.
Why: The Campaigns page only loaded the first 100 workspaces, which omitted Sakha Media Group's General workspace, while the campaign overview routed to the generic Spaces page and could open the previously active workspace instead.
Impact: Existing campaign workspaces, including Sakha Media Group's General workspace and its Ads Research test data, are visible in the Campaigns list and open reliably from the campaign overview.
Files: `apps/web/src/app/(dashboard)/campaigns/_components/CampaignsHub.tsx`, `apps/web/src/app/(dashboard)/campaigns/_lib/fetch-all-campaign-spaces.ts`, `apps/web/src/app/(dashboard)/campaigns/_lib/fetch-all-campaign-spaces.test.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignOverviewTab.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignOverviewTab.test.tsx`

## [2026-07-22 12:03] - [FIX]

What: Root-caused Home Agenda Team scope returning personal-only events on production (identical to Mine, labels like dylan@…, no team_available). Live API ignored `scope=team` because production lacked the Team agenda path (`CalendarAgendaQuerySchema.scope` + `IntegrationsCalendarTeamService` + Mine merge) after later git/CLI deploys overwrote earlier archive ships. Redeployed working-tree Team agenda to `roas-api`. Also moved agenda `account_label` under the event title (muted caption) instead of a right-column truncator, and shipped that UI on `roas-web`.
Why: With Team selected, Dylan only saw personal Composio calendars; teammate Directory calendars (Aaron/Bryce/Nefi/…) never appeared despite confirmed identities and working DWD.
Impact: `GET …/calendar/agenda?scope=team` now returns teammate names + Mine merge (verified live: 55 events, Aaron/Bryce/Nefi labels). Agenda list titles stay readable with owner under the title.
Files: `calendar-events.dto.ts`, `integrations-calendar-team.service.ts`, `integrations-calendar.service.ts`, `integrations.module.ts`, `AgendaCardEventEntry.tsx`, `integration-connections.md`

## [2026-07-22 12:03] - [OPS]

What: Deployed Team Agenda API + Agenda label layout to ROAS production via CLI archive (no git push). `roas-api` `dpl_DB9P88YFBfxwihA5AVD4kD3VkzJi` → api.roas.io; `roas-web` `dpl_294vMkDnU3K6YX8EFKMYScHgar2M` → app.roas.io.
Why: Team agenda code existed only in the dirty working tree; production had drifted to a personal-only agenda handler.
Impact: Hard-refresh Home → Agenda → Team should show teammate calendars; Mine stays personal. Label sits under the title.
Files: Vercel Production `roas-api` / `roas-web`

## [2026-07-22 12:11] - [FEATURE]

What: Moved Ready-for-delegation and Team calendar identity review into Team → People (Teammates / Calendars). Org Settings → Team deep-links to People; Integrations Org Workspace panel is connect/sync + link only.
Why: Keep human resolution in People, not Org Settings.
Impact: Local main now owns the People consolidation WIP.
Files: `SlackPeopleView.tsx`, `PeopleTeamCalendarsView.tsx`, `teammates/*`, `OrgSettingsContent.tsx`, `GoogleWorkspaceIdentitiesPanel.tsx`

## [2026-07-22 12:24] - [FIX]

What: Stopped Brain home status from staying stuck on Loading by removing `scopeOptions` identity from the health-batch effect deps (capture campaign scope entries once per ids key). Production still needs a web deploy for this to show.
Why: Scope-nav re-renders cancelled in-flight `/api/brain/health/batch` loads before `setHealthLoading(false)`, so every row stayed on Loading even after the lite RPC was live.
Impact: Local/main + next `roas-web` deploy show real status/memory counts instead of perpetual Loading.
Files: `BrainHome.tsx`

## [2026-07-22 13:03] - [FIX]

What: Fixed Fathom webhook user resolution so teammate-recorded shared-team calls attribute to the connected ROAS account via invitee/shared_with match, or the sole `shared_team_recordings` subscriber when Fathom omits the signature.

Why: Prod was dropping Nate/Nefi-hosted webhooks (`refusing fallback`) because unsigned payloads only matched `recorded_by` to Dylan’s email, so Team meetings never landed in Personal Meetings.

Impact: Shared-team Fathom calls auto-ingest into Dylan’s Meetings again; multi-subscriber unsigned events still require invitee match or a signature.

Files: `fathom-webhook.service.ts`, fathom controller tests, changelog.

## [2026-07-22 13:20] - [FIX]

What: Landed Team Agenda (`scope=team`) onto the same branch as the Fathom shared-team ingest fix so a production `roas-api` deploy keeps teammate calendars and auto-ingests Nate/Nefi-hosted Fathom calls.
Why: Clean `main` lacked Team Agenda (archive/CLI only); deploying Fathom alone would wipe Agenda Team on `api.roas.io`.
Impact: One production deploy restores both Home Team Agenda and Personal Meetings auto-ingest for shared-team recordings.
Files: `integrations-calendar-team.service.ts`, calendar DTO/service/module, AgendaCard*, `fathom-webhook.service.ts`

## [2026-07-22 13:36] - [OPS]

What: Deployed combined Fathom shared-team ingest + Team Agenda to production `roas-api` (`dpl_Gfx52gqMb4ZWqp3SVLG17VNrnbSj` → api.roas.io) from clean `03cbe1ea`. `roas-web` already READY on the Team Agenda UI commit.
Why: GitHub gitSource deploys for roas-api were being canceled; clean CLI archive deploy was required after fixing the Team Agenda TS2353 build break.
Impact: Hard-refresh Home Agenda Team + next Nate/Nefi-hosted Fathom call should auto-land in Personal Meetings.
Files: Vercel Production `roas-api` / `roas-web`
