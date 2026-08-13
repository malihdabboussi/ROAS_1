# Changelog - August 13, 2026

## 2026-08-13 09:00 - [REFACTOR]

What: Centralized Quick Missions browser events in the missions domain utility and routed empty-chat Mission quick starts through the existing quick-start hook.

Why: Keep Mission launches consistent across Home, Space chat, and the shell Create catalog while removing branch-owned LOC growth from the allowlisted Space chat panel.

Impact: Mission quick starts still open the background-mission picker without seeding composer text; the Space chat panel returns to its architecture-baseline line count.

Files: `apps/web/src/lib/missions/quick-missions-events.ts`, `apps/web/src/lib/missions/index.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.test.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `documentation/utilities/quick-missions-events.md`, `documentation/utilities/README.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-08-13 11:51 - [FIX]

What: Aligned the Chat conversation and artifact panes with one ownership model, added persisted artifact-pane resizing, routed every final-output card into the in-app artifact viewer, moved conversation actions beside the summary toggle, and made the left-side rename pencil hover/focus-only. Repaired the broad web test harness gaps exposed by the verification run.

Why: Mission and creation outputs must remain interactive beside their originating chat without duplicate pane toggles, browser-tab escapes, immovable panels, or stale navigation/test contracts.

Impact: Chat can keep multiple background Missions conversational while their Mission/artifact workspace opens, resizes, expands, collapses, and closes predictably. PDF, DOCX, project, widget, document, media, and typed artifact outputs all use the shell viewer. The complete web test suite now resolves the context workspace package and isolates sidebar data dependencies.

Files: `apps/web/src/components/conversations/ConversationHeaderTitle.tsx`, `apps/web/src/components/conversations/ConversationHeaderTitle.test.tsx`, `apps/web/src/components/conversations/index.ts`, `apps/web/src/components/shell/ShellArtifactViewerColumn.tsx`, `apps/web/src/components/shell/ShellArtifactViewerColumn.test.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.test.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellTopBar.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceConversationHeaderMenu.tsx`, `apps/web/src/features/spaces/components/chat/SpaceConversationHeaderMenu.test.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.types.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.tsx`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.test.tsx`, `apps/web/src/features/studio/components/message-bubble/open-final-output-in-shell.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-data.test.ts`, `apps/web/tests/components.test.tsx`, `apps/web/vitest.config.ts`, `documentation/features/missions.md`, `.docs/plans/agent-follow-up-work.md`

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
## 2026-08-13 15:34 - [FIX]

What: Centered and widened the Spaces live-voice transcript, added minimize/restore controls with a floating in-chat voice player, and transparently retries one newly created session when the WebSocket reports an expired machine-local session.

Why: Live voice content rendered against the left edge, blocked navigation back to the normal chat, and occasionally exposed a transient `Voice session expired` failure that succeeded on manual retry.

Impact: Voice transcripts now occupy the central chat column, an active call can remain connected while the user works in the chat, and the first transient session-affinity failure recovers without user action.

Files: `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceLiveTranscript.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.test.tsx`
