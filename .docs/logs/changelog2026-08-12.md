# Changelog - August 12, 2026

## 2026-08-12 00:53 - [FIX]

What: Reconciled parallel agenda, shell, composer, agent-action, and sidebar branches for the production release; repaired action-schema examples, instant-meeting messages, quick-start integration, and combined sidebar capability types.

Why: Parallel Claude, Cursor, and Codex branches evolved overlapping contracts independently and required explicit integration before release.

Impact: The consolidated branch passes the web TypeScript check while preserving the completed meeting agenda, clarification, action intelligence, draft editing, shell stability, Create menu foundation, and video work.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/config/home-agenda-messages.config.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/components/layout/sidebar/sidebar-types.ts`

## 2026-08-12 00:55 - [FIX]

What: Added the active `search_conversations`, `get_canvas_board`, and `apply_canvas_operations` actions to the PromptMode backend plugin capability list.

Why: The consolidated agenda/canvas branch exposed these governed actions, but the plugin transport would have stripped them from agent workspaces.

Impact: Agent capability drift validation covers and exposes the completed conversation-search and canvas workflows.

Files: `docker/tools/vibey-backend/index.ts`
