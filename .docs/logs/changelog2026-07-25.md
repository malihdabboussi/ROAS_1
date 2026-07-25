# Changelog - July 25, 2026

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
