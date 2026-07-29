# Changelog - July 29, 2026

## [2026-07-29 12:58] - [FIX]

What: Added a durable run-status probe when a chat stream keeps receiving heartbeat bytes but stops delivering structured agent events. Completed or failed runs now enter the existing reconciliation flow, while genuinely active runs remain connected. Added regression coverage for heartbeat-only completed and active runs plus stream closure before a terminal event.

Why: A production chat completed and persisted its 2,605-character answer, but the live browser connection stopped after context/tool events. Heartbeats kept the old stall detector satisfied, so the saved answer did not appear until refresh.

Impact: Stalled live delivery now self-recovers after 60 seconds without requiring a page refresh or a manual “continue” message, while long-running active work is not aborted solely because its heartbeat stream is quiet between structured events.

Files: `apps/web/src/features/studio/services/stream-resilience.ts`, `apps/web/src/features/studio/services/stream-resilience.test.ts`, `apps/web/src/features/studio/services/chat-stream-interruption.test.ts`, `documentation/features/chat-stream-recovery.md`

## [2026-07-29 12:22] - [FEATURE]

What: Added one prioritized activity indicator to shared chat-history rows: amber for unresolved user action, animated purple while the agent is working, blue for unread assistant activity, and no indicator once read or idle. Added per-user conversation read timestamps and automatic read marking on selection.

Why: Background chat progress, completed unread results, and conversations waiting on the user were not visible from the left chat list.

Impact: All shell, Space, Team, and full-page chat lists that use the shared conversation list now expose the same activity state without duplicate green/blue meanings. Existing conversations are backfilled as read during migration.

Files: `apps/web/src/components/conversations/`, `apps/web/src/lib/conversations/`, `apps/api/src/modules/conversations/`, `supabase/migrations/20260729123000_conversation_activity_states.sql`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-29 12:11] - [FIX]

What: Removed the unsupported API TypeScript path mapping that made Vercel recompile `@vibey/api-shared` source after the Nest build.

Why: The frontend deployed the scheduled-meeting resolver while the backend deployment failed during Vercel's function compilation, leaving production on an older API without `POST /spaces/:spaceId/meetings/resolve`.

Impact: The backend can deploy its prebuilt Nest output and compiled shared package consistently, allowing the meeting workspace resolver and persistent meeting chat flow to reach production.

Files: `apps/api/tsconfig.json`.

## 2026-07-29 12:05 - [FIX]

What: Closed public sign-ups for now — `/register` redirects to login, API `POST /auth/register` rejects new accounts, Sign up CTAs removed/retargeted to login, marketing register links point to login, and AuthModal is login-only.

Why: Public registration needed to be blocked temporarily while keeping invite-based onboarding (`/invite`, `/join`, org invite tokens) available.

Impact: New users cannot create accounts via public register UI or API. Existing users can still sign in. Reopen by setting `NEXT_PUBLIC_WAITLIST_MODE=false` and redeploying.

Files: `apps/web/src/middleware.ts`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/shared/layout.tsx`, `apps/web/src/features/spaces/components/shared/RestrictedViewPlaceholder.tsx`, `apps/web/src/features/public-agent/components/common/ConversionBar.tsx`, `apps/api/src/modules/auth/services/auth.service.ts`, `apps/api/src/modules/auth/config/auth-errors.config.ts`, `apps/website/src/components/*`, `apps/web/e2e/*`, env templates

## 2026-07-29 10:25 - [FEATURE]

What: Made every agenda call open the curated meeting workspace directly, added scheduled workspace creation/reuse for future calendar calls, connected the workspace to the existing main shell chat, and placed live notes and call snippets into that same conversation timeline.

Why: Past calls were hidden behind an intermediate detail modal, future calls had no canonical workspace until Fathom arrived, and meeting details previously rendered a second isolated chat instead of using the app's main chat.

Impact: A future meeting now keeps one identity from agenda prep through the live call and post-call Fathom processing. Opening its workspace automatically opens the meeting's conversation in the existing left chat, notes and snippets remain typed meeting records while also appearing in that conversation, and later Fathom recordings can reconcile onto the scheduled workspace.

Files:

- `apps/api/src/modules/meetings/`
- `apps/web/src/features/home/`
- `apps/web/src/components/global-chat/`
- `apps/web/src/app/(dashboard)/home/`
- `documentation/features/meeting-follow-up-slack.md`

## 2026-07-29 12:18 - [FIX]

What: Made Quick Missions reuse an attached chat campaign and Space, added a searchable Campaign → Space fallback, changed Tasks / Files / Sources into an in-flow third chat column, and restored generated-image cards to the shared viewer.

Why: Scoped chats were asking for context they already had, the fallback was difficult to search, the work summary overlaid chat, and a Space media listener consumed image-open events before the persistent viewer could handle them.

Impact: Quick production starts from the correct linked Space, unscoped launches remain easy to target, chat and work content resize without overlap, and generated image cards open their actual asset viewer.

Files: `apps/web/src/features/spaces/components/playbooks/`, `apps/web/src/components/shell/`, `apps/web/src/features/spaces/hooks/use-space-open-media-event.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `documentation/features/missions.md`, `documentation/features/claude-chatgpt-shell.md`

## 2026-07-29 13:12 - [FIX]

What: Replaced the large in-chat campaign save form with a compact dismissible suggestion that opens the existing Campaign & Space picker in the right summary panel.

Why: The old form duplicated the canonical scope picker, consumed too much chat space, and appeared even when the conversation or visible screen had already linked campaign context.

Impact: Unscoped chats get one lightweight guide into the established workflow, while campaign- or Space-linked chats no longer receive a redundant prompt.

Files: `apps/web/src/components/global-chat/components/ChatCampaignBrainNudge.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, focused tests, `documentation/features/claude-chatgpt-shell.md`
