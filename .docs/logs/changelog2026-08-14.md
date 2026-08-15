# Changelog - August 14, 2026

## [2026-08-14 10:33] - [FIX]

What: Pixel `extract_url_transcript` now pulls YouTube/TikTok/Instagram/X/Facebook transcripts through the main API Social Analysis routes before yt-dlp, and failed pulls no longer tell the agent captions are missing or to ask for a paste.

Why: Native captions and yt-dlp are often blocked on the Fly agent-api host, and the previous ScrapeCreators fallback needed `SCRAPECREATORS_API_KEY` on that host. The key already lives on the main API. Users send a video URL in the app and expect Pixel to pull the transcript.

Impact: After native captions miss, Pixel calls `GET /api/integrations/scrapecreators/.../transcript` via `mainApiCall` (credits charged once on the main API). Direct ScrapeCreators remains a last fallback. Agent docs and the failure contract forbid “captions unavailable” / paste-the-transcript replies after a single miss.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-transcript-payload.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, transcript unit tests.

## 2026-08-14 10:35 - [FEATURE]

What: Added in-selector Mission and More submenus to chat Create, context-specific guided Mission names and visual treatment, exact Output-to-chat navigation, responsive Mission/subtask Overview and Activity views, a visible artifact-pane resize grip, and exact-message Reply in place of chat feedback thumbs.

Why: Mission launches, simultaneous receipts, narrow detail panes, and output/message navigation were ambiguous or difficult to use from the chat workspace.

Impact: Users can choose a Mission playbook without leaving Create, distinguish runs by playbook and Space, resize or switch narrow Mission details cleanly, reopen Outputs or locate their receipt, and reply to one assistant message with durable agent context.

Files: `apps/web/src/components/shell/*`, `apps/web/src/components/global-chat/lib/global-chat-seed-match*`, `apps/web/src/components/chat/AgentTurnFeedbackActions*`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell*`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal*`, `apps/web/src/features/studio/components/ChatInput*`, `apps/web/src/features/studio/components/message-bubble/*`, `apps/web/src/lib/agent-feedback/use-agent-turn-feedback.ts`, `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`, `apps/agent-api/src/modules/chat/services/chat-reference-context.service.ts`, `apps/agent-api/src/modules/chat/services/conversation-reference.util*`, `documentation/features/missions.md`, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-14 10:54 - [FIX]

What: Routed exact-message Reply seeds through the selected conversation's authoritative Space/Campaign scope so the mounted composer restores the referenced message chip before send.

Why: Production verification showed that the shell work context could lag the selected conversation, causing the Space-scoped chat panel to reject a Reply seed for the wrong panel.

Impact: Reply now visibly attaches the selected assistant message in the active conversation and sends that exact reference to the agent context pipeline.

Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`.

## 2026-08-14 11:30 - [FIX]

What: Matched global chat seeds against the selected conversation's effective Space scope, the same scope used by the mounted composer.

Why: Home chat can host a Space-scoped conversation while the shell panel itself has no `spaceId`; matching against the shell prop rejected exact-message Reply seeds before the composer could restore them.

Impact: Exact-message Reply references now reach the visible composer even when a Space conversation is opened from the general home shell.

Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`.

## 2026-08-14 11:42 - [FIX]

What: Restored exact-message references directly in the mounted composer when an attach seed targets that composer's conversation id.

Why: Production showed that panel-level seed orchestration could still drop a reference-only Reply handoff even after its Space scope matched; the composer already owns the authoritative conversation id and reference-chip state.

Impact: Reply reliably renders the selected assistant message as a removable composer chip without depending on shell scope or global active-conversation timing.

Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-restored-message-references.ts`, `apps/web/src/features/studio/components/ChatInput/use-restored-message-references.test.ts`.

## 2026-08-14 11:51 - [FIX]

What: Routed assistant Reply and Fork actions through `MessageBubble`'s effective conversation id, including ordered-block messages.

Why: Space/Home chat already supplies an active conversation override for message rendering, but assistant actions still targeted each stored message row's conversation id, which could differ from the mounted composer.

Impact: Reply seeds target the visible conversation and are accepted by that conversation's composer instead of being silently ignored as belonging to another chat.

Files: `apps/web/src/features/studio/components/MessageBubble.tsx`, `apps/web/src/features/studio/components/MessageBubble.test.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`.

## 2026-08-14 13:59 - [FIX]

What: Taught Pixel to click through a live funnel, submit a labeled test lead, and inspect the real confirmation page, and turned on the production browser so that path can actually run.

Why: A QC request to register a test lead came back asking for a confirmation URL. The previous browser-QC rule treated any form submit as unauthorized, and the live browser was disabled behind an Instagram-only proxy.

Impact: When someone asks Pixel to QC a funnel and click Register Now, Pixel fills a fake test lead, submits, and reviews the resulting page instead of stopping at fetched HTML.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `apps/agent-api/src/modules/shared/openclaw-gateway.visual-review.test.ts`, `apps/agent-api/src/modules/agent-sync/services/pixel-live-page-clickthrough.test.ts`, `supabase/migrations/20260814140000_pixel_live_page_clickthrough.sql`, `docker/openclaw.json`, `docker/supervisord.conf`, `docker/vibey-browser-sidecar.sh`, `docker/BROWSER_NETWORK_ISOLATION.md`, `documentation/features/website-artifacts.md`.
