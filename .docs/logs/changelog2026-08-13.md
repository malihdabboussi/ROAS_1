# Changelog - August 13, 2026

## [2026-08-13 12:05] - [FIX]

What: Reorganized Pixel's post-call Slack review into bold `Call Summary`, `Action Items`, and `Client Recap Message` sections; renamed the internal Fathom link to `Call Recording`; and kept legacy recording links out of the client-ready draft.

Why: The previous `Call report`, `Proposed action items`, and `Proposed shareable recap` labels did not clearly distinguish internal call context from the message intended for the client.

Impact: Review DMs are easier to scan, the client copy is visibly separated in the thread, and automatic internal-channel delivery retains a compact recording link without contaminating the client message.

Files: `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`, `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.workflow.ts`, `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-confirm.service.test.ts`, `docker/agents/vibey/skills/post-call-delivery/SKILL.md`, `supabase/migrations/20260813120500_update_post_call_delivery_message_boundaries.sql`, `documentation/features/meeting-follow-up-slack.md`.

## 2026-08-13 11:54 - [FIX]

What: Moved fresh Home-chat conversation reset ownership from the composer into the shell's `chat=starting` transition and added regression coverage for preventing a previously active conversation from replacing the new chat route.

Why: Signed-in Home sends could restore the prior conversation before the seeded message created its new thread, dropping the submitted message from the visible flow.

Impact: Home now preserves the previous conversation as a routing baseline, clears it when the starting surface mounts, and routes only after the newly created conversation becomes active.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`
