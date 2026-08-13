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

## [2026-08-13 15:24] - [FIX]

What: Registered native Google Doc creation as a shared Google Drive agent capability and normalized Google Docs service aliases to the existing Drive connection.

Why: The UI correctly showed Google Drive enabled, but agent discovery treated Google Docs as a separate provider with no registered creation action, so Pixel falsely asked for another connection.

Impact: Pixel now reuses the enabled Google Drive account, discovers `create_google_doc`, and returns the created document ID/link. If that Drive account is genuinely unavailable, the existing integration repair card is shown instead.

Files: `supabase/migrations/20260813152000_google_drive_agent_doc_capability.sql`, `apps/agent-api/src/modules/shared/utils/integration-id.util.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/artifacts/services/google-drive-agent-doc-capability.test.ts`, `documentation/features/integration-connections.md`.

## [2026-08-13 15:34] - [FIX]

What: Simplified the universal chat `+` menu to photos/files, attachments, and integrations; removed Campaigns from Attach; made Home's Choose Space and Plugins buttons open their panels directly; and changed the microphone to present voice input versus live conversation before starting.

Why: The composer mixed creation, agent configuration, access policy, and context selection into one menu, dedicated shortcuts reopened that entire menu, and clicking voice input skipped the available mode choice.

Impact: Chat entry points now open focused, viewport-safe panels and users explicitly choose how they want to speak before audio begins.

Files: `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-controller.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-13 15:43] - [FIX]

What: Added Program → Campaign → Space trees to Home and chat context selectors, changed shared program/campaign/space picker ordering to case-insensitive A–Z, and added direct detailed-workspace navigation for Programs, Brain, Team, Flows, and Meetings.

Why: Flat campaign/space lists produced indistinguishable `General` rows, selection order varied by surface, and high-level work context rows did not provide a clear route into their detailed workspace.

Impact: Scope selection now preserves its hierarchy, behaves consistently across shared chat, flow, mission, relocation, conversation, campaign hub, and sidebar selectors, and provides predictable detailed navigation.

Files: `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, shared space/campaign/program grouping utilities and selectors, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-13 15:34 - [FIX]

What: Centered and widened the Spaces live-voice transcript, added minimize/restore controls with a floating in-chat voice player, and transparently retries one newly created session when the WebSocket reports an expired machine-local session.

Why: Live voice content rendered against the left edge, blocked navigation back to the normal chat, and occasionally exposed a transient `Voice session expired` failure that succeeded on manual retry.

Impact: Voice transcripts now occupy the central chat column, an active call can remain connected while the user works in the chat, and the first transient session-affinity failure recovers without user action.

Files: `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceLiveTranscript.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.test.tsx`
