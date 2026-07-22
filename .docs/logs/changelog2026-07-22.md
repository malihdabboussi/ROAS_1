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
