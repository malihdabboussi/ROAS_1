# Changelog - July 30, 2026

## 2026-07-30 12:54 - [FIX]

What: Added a turn-level Static Ad Production routing guard, visual examples for chat and Builder choices, and removed the preselected Static Ad Book/Myth vs. System state.

Why: Pixel could ignore the skill's clarification gate, silently choose Myth vs. System, and write copy or attempt rendering before the user selected Validate Messaging, Image Brief, or Static Ad Book.

Impact: Ambiguous Studio requests now require the visual three-lane card, explicit lane requests stay in their selected workflow, non-Studio channels receive equivalent numbered choices, and Quick Missions cannot launch until the user selects a lane and any required format.

Files: `apps/agent-api/src/modules/chat/services/static-ad-chat-routing.ts`, `apps/agent-api/src/modules/chat/services/chat-gateway-input.service.ts`, `apps/web/src/components/artifacts/StaticAdChoicePreview.tsx`, `apps/web/src/components/chat/clarification-card-question-step.tsx`, `apps/web/src/features/spaces/components/StaticAdProductionFields.tsx`, `apps/web/src/features/spaces/components/ads-research/`, `documentation/features/missions.md`, `documentation/frontend-shared-surfaces.md`

## 2026-07-30 12:16 - [FIX]

**What:** Preserved bounded originating-chat evidence and Space/campaign scope across direct agent delegation, added a corrective provider-verification pass for unsupported missing-call responses, and repaired Delegator's Fathom/meeting retrieval instructions for existing and future runtimes.

**Why:** Delegator received only the shortened task description, then searched local workspace context without checking the connected Fathom source and incorrectly reported that an available call was missing.

**Impact:** Delegated meeting work can reuse the source chat's known task and call details, retrieve the matching provider transcript, and no longer asks users to resend a recording before accessible evidence sources have been checked.

**Files:** `apps/agent-api/src/modules/artifacts/`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/api/src/modules/space-templates/data/__tests__/delegation-desk-provisioning.contract.test.ts`, `docker/agents/templates/delegator/TOOLS.md`, `supabase/migrations/20260730121500_repair_delegator_meeting_retrieval.sql`, `documentation/features/spaces-automation.md`

## 2026-07-30 12:25 - [STYLE]

What: Replaced the collapsed chat-history restore rail with a purple, icon-only history control in the chat header's top-left corner.

Why: Keep the collapsed chat surface clean and visually balance the existing top-right close control.

Impact: Collapsing chat history no longer adds a bordered row or text label; the accessible history action remains available in the chat header and restores the rail when selected.

Files:

- `apps/web/src/components/shell/ShellChatDrawer.tsx`
- `apps/web/src/components/shell/ShellChatDrawer.test.tsx`
- `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`
- `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`
- `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.types.ts`

## [2026-07-30 12:44] - [STYLE]

What: Moved the embedded ROAS Portal refresh and new-tab controls to the bottom-right corner, kept the Portal surface full-height, and hid every workspace-menu dock while Portal mode is active.

Why: The ROAS-owned controls and workspace menu were covering Portal-owned navigation and content.

Impact: Portal navigation remains unobstructed while refresh, pop-out, and the top-bar Workspace / Portal switch stay available.

Files: `apps/web/src/components/shell/PageGraderPortalSurface.tsx`, `apps/web/src/components/shell/PageGraderPortalSurface.test.tsx`, `apps/web/src/components/shell/ShellMenuDockLayout.tsx`, `apps/web/src/components/shell/ShellMenuDockLayout.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `documentation/features/integration-connections.md`
