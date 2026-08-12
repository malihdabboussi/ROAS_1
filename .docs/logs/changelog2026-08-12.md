# Changelog - August 12, 2026

## 2026-08-12 08:57 - [REFACTOR]

What: Ported the completed shared work-item list and Space mapping foundation onto post-#136 main, moved reusable Space field cells/helpers behind shared domain paths with compatibility re-exports, and documented the remaining PR/branch audit.

Why: The completed shared ownership and item-relocation behavior was the only production-ready semantic delta not already shipped by PR #136.

Impact: Meetings and My Tasks use the same tested work-item list/move surfaces while current production meeting behavior remains intact; superseded rescue PRs can be closed safely.

Files: `apps/web/src/components/work-items/`, `apps/web/src/lib/work-items/`, `apps/web/src/components/spaces/cells/`, `apps/web/src/lib/spaces/`, Home task/meeting consumers, `documentation/frontend-shared-surfaces.md`, `.docs/plans/post-release-cleanup-audit-2026-08-12.md`.

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
