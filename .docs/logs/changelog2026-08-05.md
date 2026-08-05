# Changelog - August 05, 2026

## [2026-08-05 14:05] - [FEATURE]

What: Shipped yesterday's Meeting Workspace board UI to production path — shell work area (not old fullscreen modal), single-column Attachments/Action items/Recordings, context chips, and meeting chat open via shared global-chat rail intent (no Home→Spaces store import).
Why: Board work was left in stash when the action-items API shipped; localhost and prod still showed the legacy modal.
Impact: Opening a Home Agenda meeting shows the curated board with left-rail meeting chat. Hard-refresh after `roas-web` deploy.
Files: `MeetingWorkspaceDialog.tsx`, `HomeMeetingDetailHost.tsx`, `MeetingWorkspaceAttachments.tsx`, `MeetingActionItemsSection.tsx`, `MeetingWorkspaceContextLinks.tsx`, `GlobalChatPanel.tsx`, `use-global-chat-store.ts`, related home libs/tests; removed `MeetingContextSidebar` / `MeetingNoteCapture`

## [2026-08-05 14:12] - [FIX]

What: Restored `ConversationScopePicker` `onOpenCampaign` prop so `roas-web` production build typechecks (ShellRightPanel already passed it).
Why: Meeting board PR merged but Vercel web deploy failed on that missing prop (pre-existing mismatch).
Impact: Unblocks `app.roas.io` deploy of the Meeting Workspace board.
Files: `ConversationScopePicker.tsx`, `ConversationScopeTrigger.tsx`, `conversation-scope-picker-layout.ts`, tests

## [2026-08-05 14:16] - [FIX]

What: Fixed MeetingWorkspaceContextLinks TypeScript index error (`id` from split could be undefined).
Why: Blocked `roas-web` production deploy after meeting board merge.
Impact: Unblocks app.roas.io deploy of the shell Meeting Workspace board.
Files: `MeetingWorkspaceContextLinks.tsx`

