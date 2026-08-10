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

## [2026-07-30 09:59] - [FIX]

What: Replaced minimized Agenda meeting details with a thin restore-only divider. Persisted each minimized occurrence into the owner’s profile preferences and added an early webhook exclusion gate that stops transcript retrieval, Brain import, Meetings automation, and Page Grader sync until the occurrence is restored.

Why: Minimized events still showed struck-through titles, times, and account details, while their state existed only in browser storage and could not stop backend Fathom processing.

Impact: Minimized meetings are visually hidden but recoverable from the Agenda, and the matching Fathom recording is not processed. A failed server sync rolls back the visual state so the UI never claims a meeting is excluded when the processor cannot honor it.

Files: `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/components/AgendaCardEventEntry.tsx`, `apps/web/src/features/home/components/AgendaMinimizedEventEntry.tsx`, `apps/web/src/features/home/components/AgendaCardEventEntry.test.tsx`, `apps/web/src/features/home/config/home-toast-errors.config.ts`, `apps/web/src/features/home/services/agenda-minimize.service.ts`, `apps/web/src/features/home/services/agenda-minimize.service.test.ts`, `apps/api/src/modules/integrations/fathom/controllers/fathom.controller.ts`, `apps/api/src/modules/integrations/fathom/controllers/__tests__/fathom.controller.test.ts`, `apps/api/src/modules/integrations/fathom/dto/fathom.dto.ts`, `apps/api/src/modules/integrations/fathom/repositories/fathom.repository.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-agenda-exclusions.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-agenda-exclusions.test.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-oauth.service.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-webhook.service.ts`, `apps/api/src/test/contract/__snapshots__/route-inventory.test.ts.snap`, `documentation/features/integration-connections.md`

## [2026-07-30 11:17] - [FEATURE]

What: Replaced the Delegation Desk sidebar action that opened the generic Spaces hierarchy with a dedicated Home route and inbox-style workspace. Added direct brain-dump capture, an Outstanding queue across unfinished lifecycle stages, Holding/Ready/Delegated/Done filters, search, refresh, and existing task-panel opening.

Why: Delegation Desk is a private intake and organization surface, not a child list under General. Users need a friendly place to dump rough work before Delegator prepares or assigns it.

Impact: Home → Delegation Desk now stays in its own workspace. It continues using the same private Delegation Desk Space and automation, provisions that Space on first use, and keeps work visible as it moves from raw intake through delegation and completion.

Files: `apps/web/src/app/(dashboard)/home/delegation-desk/page.tsx`, `apps/web/src/components/layout/sidebar/SidebarHomeFlyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/features/home/components/HomeShell.tsx`, `apps/web/src/features/spaces/config/delegation-messages.config.ts`, `apps/web/src/features/spaces/containers/DelegationDeskWorkspace.tsx`, `apps/web/src/features/spaces/lib/delegation-desk-view.ts`, `apps/web/src/features/spaces/services/delegation-desk.service.ts`, focused tests, `documentation/features/spaces-automation.md`

## [2026-07-30 11:34] - [FEATURE]

What: Added a Home Agenda **New call** workflow that creates a live impromptu meeting workspace with a persistent chat, notes, optional participant matching context, and an immediate Agenda placeholder. Extended meeting-source reconciliation so a later Fathom recording attaches its transcript, recap, and action items to that same workspace.

Why: Scheduled calendar calls could open the canonical meeting workspace before a call, but unscheduled calls had no pre-call identity. Fathom therefore had nothing durable to enrich after an impromptu call.

Impact: Users can start working from the meeting workspace before an unscheduled call begins, keep live notes and Pixel context in one place, and receive the Fathom recording and outputs in that same meeting afterward instead of a duplicate call row.

Files: `apps/web/src/features/home/components/{AgendaCard,AgendaCardChrome,HomeInstantMeetingHost}.tsx`, `apps/web/src/features/home/services/meeting-workspace-api.ts`, Home message/test files, `apps/web/src/lib/services/calendar-api.ts`, `apps/api/src/modules/meetings`, `apps/api/src/modules/spaces/services/meetings-precall-prep.{helpers,service}.ts`, focused tests, `documentation/features/integration-connections.md`

## [2026-07-30 12:44] - [STYLE]

What: Moved the embedded ROAS Portal refresh and new-tab controls to the bottom-right corner, kept the Portal surface full-height, and hid every workspace-menu dock while Portal mode is active.

Why: The ROAS-owned controls and workspace menu were covering Portal-owned navigation and content.

Impact: Portal navigation remains unobstructed while refresh, pop-out, and the top-bar Workspace / Portal switch stay available.

Files: `apps/web/src/components/shell/PageGraderPortalSurface.tsx`, `apps/web/src/components/shell/PageGraderPortalSurface.test.tsx`, `apps/web/src/components/shell/ShellMenuDockLayout.tsx`, `apps/web/src/components/shell/ShellMenuDockLayout.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `documentation/features/integration-connections.md`
