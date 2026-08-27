# Changelog - August 26, 2026

## 2026-08-26 10:20 - [FIX]

What: Stabilized shell page visibility and Mission artifact expansion controls. Chat now shows Show Page only when the page is closed; open pages use Close Page in their own header; Mission More, Expand/Collapse, and Close Page controls share one header row.

Why: Mission expansion combined conflicting relative and absolute positioning, while the chat and page headers exposed overlapping collapse controls that could resize, hide, or reopen the wrong surface.

Impact: Expand/Collapse changes only the Mission pane layout, Close Page changes only page visibility, and the controls remain predictable across Mission, artifact, and standard page surfaces.

Files: apps/web/src/components/shell/ShellArtifactViewerPanel.tsx, apps/web/src/components/shell/ShellChatHeaderPageControl.tsx, apps/web/src/components/shell/ShellMissionArtifactViewerAdapter.tsx, apps/web/src/components/shell/ShellWorkAreaControl.tsx, apps/web/src/features/mission-control/components/dialogs/, documentation/features/missions.md

## 2026-08-26 10:28 - [FIX]

What: Made the Home New Chat composer inherit the globally selected Client Workspace campaign and prefer its mapped General Space, with a mapped-Space fallback.

Why: New Chat remained unscoped even while the platform-wide client filter was active.

Impact: The composer displays the selected client context immediately and seeds new conversations with the same client campaign and Space IDs.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `documentation/utilities/client-scope.md`

## 2026-08-26 10:32 - [FIX]

What: Top-aligned Conversation scope flyouts with the row that opens them while retaining horizontal viewport flipping and vertical edge clamping.

Why: Nested campaign, client, and Space flyouts were bottom-aligned, placing their content above the hovered row and making the pointer path feel disconnected.

Impact: Home, Recents filters, and Connections now open nested scope menus directly beside the hovered item for a predictable horizontal navigation path.

Files: apps/web/src/components/conversations/conversation-scope-picker-layout.ts, apps/web/src/components/conversations/conversation-scope-picker-layout.test.ts

## 2026-08-26 10:36 - [FIX]

What: Made Page Grader Campaign Brain sync readiness depend on embedded Page Grader memories in the mapped `ns_brains` record, and fail deterministic imports when embedding repair is incomplete.

Why: A generic Campaign Knowledge row could mark catch-up successful while all Campaign Brain memories remained unembedded, causing Pixel to ask for onboarding details that already existed in the client package and Slack context.

Impact: Incomplete imports remain retryable, cannot advance sync stamps or success jobs, and catch-up repairs mapped clients until their Page Grader context is retrievable by chat.

Files: `apps/api/src/modules/integrations/page-grader/repositories/page-grader-brain-sync.repository.ts`, `apps/api/src/modules/integrations/page-grader/repositories/page-grader-brain-sync.repository.test.ts`, `apps/api/src/modules/brain/services/page-grader-brain-package-ingest.service.ts`, `apps/api/src/modules/brain/services/__tests__/page-grader-brain-package-ingest.service.test.ts`, `documentation/features/page-grader-campaign-brain-sync.md`

## 2026-08-26 10:40 - [FIX]

What: Reduced All Meetings to one visible Client Workspace association and made unique Page Grader meeting matches persist the shared `client_campaign` mapping used by the table.

Why: Backfilled and newly inferred client IDs were stored in sync metadata but remained invisible because meeting rows render a different mapping contract; Campaign Space also duplicated the client context.

Impact: Existing high-confidence backfills render after refresh, future unique client calls map automatically, ambiguous/internal calls remain unassigned, and manual mappings or clears are preserved.

Files: `apps/web/src/lib/spaces/all-meetings-list-columns.ts`, `apps/web/src/lib/spaces/all-meetings-list-columns.test.ts`, `apps/api/src/modules/integrations/page-grader/services/page-grader-meeting-sync.service.ts`, `apps/api/src/modules/integrations/page-grader/services/__tests__/page-grader-meeting-sync.service.test.ts`, `documentation/utilities/all-meetings-list-columns.md`, `documentation/features/space-templates.md`

## 2026-08-26 11:33 - [FIX]

What: Consolidated Page Grader QC Slack delivery into one recipient-wide 24-hour attention window and accepted structured Campaign QC findings from Page Grader.

Why: Client- and finding-scoped cooldowns let rotating campaign hygiene findings repeatedly open or refresh Pixel noise without adding a new decision.

Impact: Campaigns can rotate without creating another top-level QC DM, follow-ups wait one day, and structured findings retain their real client, campaign, severity, and source identity instead of becoming an unscoped digest fallback.

Files: `apps/api/src/modules/integrations/page-grader/services/page-grader-qc-follow-up.ts`, `apps/api/src/modules/integrations/page-grader/services/page-grader-qc-follow-up.messages.ts`, `apps/api/src/modules/integrations/page-grader/services/page-grader-qc-slack-bridge.service.ts`, `apps/api/src/modules/integrations/page-grader/services/page-grader-qc-follow-up.test.ts`, `apps/api/src/modules/integrations/page-grader/services/__tests__/page-grader-qc-slack-bridge.service.test.ts`, `apps/api/src/modules/spaces/services/slack-open-items.service.ts`, `apps/api/src/modules/spaces/repositories/slack-open-items.repository.ts`, `documentation/features/page-grader-campaign-brain-sync.md`

## 2026-08-26 11:39 - [FIX]

What: Replaced the separate Map and Change controls in Client Workspace cells with one full-cell mapping trigger. Mapped cells show only their workspace label; unmapped cells remain visually empty.

Why: The auxiliary action labels cluttered the table and the linked client label navigated away instead of editing the row's mapping.

Impact: Clicking either a workspace label or an empty editable cell opens the existing mapping dropdown without changing mapping persistence.

Files: `apps/web/src/components/spaces/cells/ClientCampaignCell.tsx`, `apps/web/src/components/spaces/cells/ClientCampaignCell.test.tsx`, `documentation/utilities/all-meetings-list-columns.md`, `documentation/features/space-templates.md`
