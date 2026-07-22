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
