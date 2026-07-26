# Changelog - July 25, 2026

## [2026-07-25 17:15] - [FIX]

What: Chat history titles now use Gemini short topic labels (Claude/ChatGPT-style) instead of raw first-message dumps, with a bounded auto-title backfill for existing raw/"Slack Chat" rows; list rows use looser spacing and default to no leading icons.
Why: Inbox history looked dense and hard to scan because shell/studio never ran suggest-title, Slack seeded "Slack Chat", and stream success reaffirmed the raw snippet over any curated title.
Impact: New in-app and Slack chats get summary titles; opening chat history upgrades up to 12 existing raw titles; Recents-style spacing reads closer to Claude/ChatGPT.
Files: `conversation-title.ts`, `conversation-title-scheduler.ts`, `ShellChatMenu.tsx`, `SpaceConversationRows.tsx`, `conversation-records.controller.ts`, `conversations.service.ts`, `slack-service-conversation.base.ts`, `slack.service.ts`

## [2026-07-25 17:05] - [FEATURE]

What: Added scoped List, Board, Calendar, Overview, and Assets work views across All Tasks, Programs, and Campaigns, with URL-backed filters and persisted Program view visibility.
Why: Programs and Campaigns lacked the same useful work-management surfaces already available inside Spaces.
Impact: Users can manage work at the organization, Program, and Campaign levels without leaking tasks or assets across Campaign boundaries.
Files: `apps/web/src/components/work-views`, `apps/web/src/lib/work-views`, All Tasks, Program and Campaign routes, Programs API, tests, and feature documentation.

## [2026-07-25 17:08] - [FEATURE]

What: Rebuilt Home around Agenda and Inbox, added Primary/Other/Later/Cleared notification triage, dedicated Inbox APIs, full-page Home routes, and a Home navigation flyout.
Why: Home needed actionable daily work surfaces and notification state that remains independent from read status.
Impact: Users can triage notifications with optimistic recovery, see accurate bucket counts, and open dedicated Inbox, Meetings, and My Tasks pages.
Files: Home components and routes, notification components/contracts/API, Missions notification controller/service/repository, sidebar Home flyout, and `20260725120000_user_notifications_inbox_triage.sql`.

## [2026-07-25 17:10] - [FEATURE]

What: Upgraded the shared image viewer into a direct image-editing studio with prompt edits, persisted aspect-ratio versions, version history, progress, download, Canva handoff, and asset-ID hydration.
Why: Image previews previously required indirect chat handoffs and could fail when the opening card did not contain a complete URL.
Impact: Images opened from chat, Campaigns, and Spaces now share one functional editing workflow and persist newly generated versions.
Files: `apps/web/src/components/media`, Space media workspace, shell media viewer, media-open helpers, tests, and shell feature documentation.

## [2026-07-25 17:12] - [ARCH]

What: Removed the obsolete `SidebarHqSection` oversized-file allowlist entry after the shared sidebar extraction reduced it below its component limit.
Why: The staged architecture gate correctly rejected a stale exception for a now-compliant file.
Impact: The architecture ratchet now enforces the normal component limit for `SidebarHqSection`.
Files: `scripts/arch/loc-allowlist.json`

## 2026-07-25 16:16 - [FIX]

What: Made Higgsfield organization credentials use an organization-scoped vault label, added Higgsfield to the canonical integrations overview provider list, and covered both paths with focused regression tests.

Why: A prior personal Higgsfield connection used the same vault uniqueness key as a later organization connection, causing the organization callback to fail with HTTP 409. Successful connections were also filtered out of the Settings overview.

Impact: A user can connect Higgsfield personally and later connect it to a workspace without a credential conflict. Connected workspace accounts now appear as connected in Integrations Library and Manage, while personal credentials remain private.

Files: `apps/api/src/modules/integrations/higgsfield/higgsfield.repository.ts`, `apps/api/src/modules/integrations/higgsfield/higgsfield.repository.test.ts`, `apps/api/src/modules/integrations/services/integrations-overview.service.ts`, `apps/api/src/modules/integrations/services/__tests__/integrations-overview-higgsfield.service.test.ts`, `documentation/features/integration-connections.md`

## 2026-07-25 08:18 - [FEATURE]

What: Added direct text and image editing in full funnel/website mode, serialized background saves with live status feedback, date-grouped and bookmarkable history, one-click first publish, and an explicit Publish updates action.

Why: The builder had durable file history and visual styling, but the core create-edit-recover-publish loop required too many indirect steps compared with leading AI website builders.

Impact: Users can edit selected content in place, replace images from their media library, understand when changes are saved, mark important versions, restore without losing later history, and publish through a clearer snapshot workflow.

Files: `apps/web/src/features/studio`, `apps/web/src/features/spaces/components/chat/FunnelDesignChatView.tsx`, `apps/web/src/lib/artifacts`, `apps/api/src/modules/funnels`, `documentation/features/website-artifacts.md`

## [2026-07-25 08:22] - [FIX]

What: Added an explicit `copy_approved` handoff for exact-copy IG organic video launches, taught the mission worker to skip only the redundant second confirmation, and added a guarded database migration that updates unchanged skill copies while preserving user-edited variants.
Why: The video skill stopped for copy confirmation even after a user filled the exact-copy form and clicked Create, preventing unattended UI, chat, and mission production from reaching footage and rendering.
Impact: Exact-copy launches can continue directly into video production; agent-written copy still requires human approval. Web payload, worker playbook, and skill migration contract tests pass.
Files: `ig-organic-video.ts`, `ig-organic-video.test.ts`, `ig-organic-video-ad.playbook.ts`, `ig-organic-video-ad.playbook.test.ts`, `ig-organic-video-ad-skill-contract.test.ts`, `20260725153000_ig_organic_video_preapproved_copy.sql`, `social-research.md`

## [2026-07-25 14:16] - [FIX]

What: Added a Railway-specific upload ignore file for the mission worker and documented why its deployment context excludes unrelated applications.
Why: Railway CLI indexed the entire monorepo and failed on an unrelated tracked machine-local symlink before the worker build could start.
Impact: Isolated mission-worker releases can be uploaded without bundling unrelated apps or failing on files outside the worker image.
Files: `.railwayignore`, `scripts/roas/README.md`

## [2026-07-25 14:20] - [FIX]

What: Applied and recorded the preapproved-copy migration on ROAS production, archive-deployed the isolated web release, and deployed the mission worker from the same release branch.
Why: Complete the production side of the ad-creation acceptance fix after local contract and rendering validation.
Impact: `app.roas.io` now serves combined latest-main deployment `dpl_CjrjiPDeFHCzjevHASubF6wCoxe1` (superseding the initial isolated deployment `dpl_HS3gpvJftMUxLWwfQhdrB62Xuaox`); Railway mission worker deployment `dd3e5dfc-c1ea-499e-a9ba-3443348a16a3` is healthy with its outbox listener and scheduler armed; production migration `20260725153000` is recorded on `lhfgtsjetcardinpgouq`.
Files: ROAS production Supabase, Vercel `roas-web`, Railway `roas-platform`

## [2026-07-25 07:31] - [STYLE]

What: Removed the under-logo AI Chats pill from the HQ rail; AI Chats is now only the top-left PanelLeft control, with tighter logo-header padding.
Why: Reclaim sidebar space and keep one clear AI drawer control.
Impact: Cleaner icon rail with unchanged drawer open/collapse behavior.
Files: `SidebarHqRail.tsx`, `ShellAiChatsButton.tsx`, `ShellTopBar.tsx`, tests, and web/website `globals.css`

## [2026-07-25 07:32] - [FIX]

What: Staged the work-area transform for one animation frame when Show page reopens it.
Why: Removing the transform during flex expansion skipped the right-edge transition.
Impact: Collapse and Show page now animate out to and in from the right.
Files: `ShellWorkspace.tsx`, `ShellWorkspace.test.tsx`

## [2026-07-25 07:34] - [FIX]

What: Kept the Program icon visible while expanded and reveal the rotated chevron only on hover.
Why: Expanded Programs permanently showed a down-chevron unlike collapsed Programs.
Impact: Program rows now share the same icon-to-chevron hover interaction.
Files: `SidebarProgramFolder.tsx`, `SidebarProgramFolder.test.tsx`

## [2026-07-25 07:36] - [STYLE]

What: Renamed Team flyout links to Agents, Skills, and People and removed the duplicate Team caption.
Why: Remove redundant wording and hierarchy.
Impact: The Team flyout has one title and concise management links.
Files: `SidebarTeamManageLinks.tsx`, `SidebarTeam2Flyout.tsx`, `SidebarTeam2Flyout.test.tsx`

## [2026-07-25 07:39] - [FEATURE]

What: Added same-list Program and Space ordering while preserving cross-parent sidebar moves, backed by `spaces.sort_order`.
Why: Existing drag-and-drop only reparented items and did not persist same-list ordering.
Impact: Programs and Spaces can be reordered directly in the sidebar.
Files: sidebar DnD components/tests, `sidebar-tree-mutation-handlers.ts`, grouped-list props, Space contracts/service, Programs sidebar components, `20260725074000_spaces_sort_order.sql`

## [2026-07-25 16:54] - [FIX]

What: Unified connected-account display and rename labels, surfaced account identities in integration group headers, and persisted provider-specific identities for Meta, Fathom, Higgsfield, and Page Grader.
Why: Generic provider names and `Account 1` fallbacks made multiple connections ambiguous, while Meta incorrectly labeled the OAuth account with its first client Page.
Impact: Settings consistently identifies the credential owner or endpoint; existing opaque ids are safely masked and future native connections persist better labels.
Files: integration settings label helper/components/tests; Meta, Fathom, Higgsfield, and Page Grader connection services/tests; `documentation/features/integration-connections.md`

## [2026-07-25 16:35] - [FEATURE]

What: Turned every empty CEO chat action and capability chip into an executable quick-start workflow with visible composer state and hidden tool-routing context. Replaced the unsupported StandUp shortcut with a private Daily Brief and renamed Super Agents to the concrete Delegate workflow.

Why: The ClickUp-inspired controls only inserted vague text prefixes, so the agent could answer conversationally without searching live data, creating an artifact, scheduling an event, or delegating work.

Impact: Find, Research, Create, Edit, Analyze, Prioritize, Schedule, Deep Search, Task, Image, Slides, Report, Doc, Daily Brief, and Delegate now route completed requests to the appropriate real platform tools, retain context through queued sends, clear routing when the seed is replaced, and require tool receipts before claiming writes succeeded.

Files: `apps/web/src/components/shell/ShellEmptyChat*`, `apps/web/src/components/shell/shell-empty-chat-prompts.config.ts`, `apps/web/src/components/shell/shell-chat-quick-start.logic.ts`, `apps/web/src/features/spaces/components/chat/SpaceChatAgentEmptyState.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`
