# Changelog - July 22, 2026

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
