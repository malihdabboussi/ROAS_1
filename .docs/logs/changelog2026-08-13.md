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

## 2026-08-13 12:09 - [FIX]

What: Made the Home composer seed its existing default General Space instead of emitting a campaign-only seed, with regression coverage for the signed-in non-org-only account path.

Why: Campaign-only seeds cannot match the Space-backed global chat panel, so the queued Home message remained unconsumed on `chat=starting`.

Impact: Default Home sends now mount the matching General Space panel, create a fresh conversation, and stream the submitted message.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`

## [2026-08-13 14:58] - [FIX]

What: Enabled Pixel's interactive browser for full funnel QC; preserved generated chat titles; required real Google Drive actions for Google Doc requests; added a connection preflight to manual Google Docs export; made the universal artifact column resizable; and removed the inert duplicate page-restore control.

Why: Pixel could scrape pages but could not click through JavaScript funnel states, successful turns overwrote concise generated titles with the first prompt, document artifacts were mistaken for Google Docs, disconnected exports opened and immediately closed a blank tab, and the right-side artifact host ignored its persisted width.

Impact: Funnel reviews can traverse buttons and rendered checkout states, Google Docs requests either return a real Drive document or a clear connection instruction, chat titles remain concise, and the bounded left history, chat, and right artifact columns are consistently resizable on desktop.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/shared/services/openclaw-gateway.service.ts`, `apps/agent-api/src/modules/shared/openclaw-gateway.visual-review.test.ts`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellWorkspaceRestoreControls.test.tsx`, `apps/web/src/features/spaces/components/docs/editor/DocEditorExportDropdown.tsx`, `apps/web/src/features/spaces/components/docs/editor/DocEditorHeaderActions.test.tsx`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/lib/config/spaces-toast-errors.config.ts`, `apps/web/src/lib/conversations/conversation-title.ts`, `apps/web/src/lib/conversations/conversation-title.test.ts`, `documentation/features/claude-chatgpt-shell.md`.
