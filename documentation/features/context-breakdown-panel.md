# Context Breakdown Panel

Last Modified: 2026-06-23

## Overview

The context breakdown panel shows how much of the current chat context window is being used and how that usage is distributed across Vibey-native categories: system, tools, skills, brain, integrations, user/team, artifacts/files, conversation, and current draft.

## Data Flow

1. `agent-api` assembles the turn instructions, gateway input messages, skill catalog, and Vibey-specific measured context slices before calling OpenClaw.
2. `agent-api` emits an estimated `context_breakdown` in a `context_update` SSE event so the panel can show system, tools, skills, brain, integrations, user/team, artifacts/files, and conversation slices while the run is active.
3. OpenClaw builds `systemPromptReport` during the run and returns it through response metadata.
4. `agent-api` merges that report with the measured context slices and emits the authoritative `context_breakdown` in the chat `done` SSE event.
5. The web app stores each breakdown by conversation and rehydrates it from conversation metadata.
6. The chat input context ring opens a composer-aligned panel above the input with a stacked bar and expandable category rows.
7. The live estimate hook overlays current composer text, attachments, artifacts, and rendered conversation messages on top of the latest server baseline without replacing a higher server-measured conversation slice.
8. When no server baseline exists yet, the composer builds an approximate estimate from the current model context window, rendered messages, draft text, pending files, artifacts, references, and pasted text so the ring can display before the first send.

The breakdown denominator is the effective context window for the run. When the user selects a concrete context option such as `272K` or `1M`, `model_settings.context_window_tokens` is validated by `agent-api`, forwarded to OpenClaw, and persisted back into conversation/message metadata. OpenClaw metadata remains the preferred source when returned because it reflects the resolved model/config cap.

## Backend Layer

- `apps/openclaw/src/gateway/openresponses-http.ts` forwards `system_prompt_report`.
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts` reads the forwarded report.
- `apps/agent-api/src/modules/chat/services/chat-context-accounting.service.ts` builds estimated and final breakdowns.
- `apps/agent-api/src/modules/chat/services/chat-turn-terminal.service.ts` emits the early `context_update` event before the model stream begins.
- `apps/agent-api/src/modules/chat/services/chat-turn-completion.service.ts` persists the final `done.context_breakdown` into conversation metadata.
- `apps/agent-api/src/modules/chat/controllers/chat.controller.ts` exposes `GET /chat/conversations/:conversationId/context-baseline`.

## Frontend Layer

- `apps/web/src/features/studio/store/use-chat-store.ts` stores breakdowns by conversation.
- `apps/web/src/features/studio/components/ChatInput.tsx` positions the panel from the composer shell so it opens above the input with side-gapped composer width.
- `apps/web/src/features/studio/components/ChatInput/ContextBreakdownPopover.tsx` renders the panel.
- `apps/web/src/features/studio/hooks/useLiveContextEstimate.ts` overlays live draft and conversation counts, and creates a pre-send estimate when no stored baseline is available.
- `apps/web/src/features/studio/utils/context-token-counter.ts` counts rendered message tokens.

## Decision Log

2026-05-25: Created a lightweight `@vibey/context-breakdown` package instead of importing browser code from `@vibey/api-shared`, because `api-shared` exports NestJS/server modules that should not be bundled into the web app.

2026-06-05: Made selected model context a first-class effective cap for the composer display, `done.context_window`, stored chat metadata, and OpenClaw overflow compaction so context usage and compaction follow the user-selected window instead of the model maximum.

2026-06-06: Made the composer context ring render from a local estimate before the first completed run, while keeping stored backend breakdowns as the richer baseline when available.

2026-06-06: Positioned the breakdown panel from the composer shell rather than the ring trigger so it opens directly above the input.

2026-06-08: Preserved backend conversation slice totals in the live estimate so the ring does not undercount hidden session context after a completed run. Empty draft attachment/artifact/reference arrays no longer add phantom JSON tokens.

2026-06-23: Added an early `context_update` stream event carrying an estimated breakdown before the model call, while keeping `done.context_breakdown` as the authoritative final run total.
