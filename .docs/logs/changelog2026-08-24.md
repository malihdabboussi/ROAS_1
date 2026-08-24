# Changelog - August 24, 2026

## 2026-08-24 10:21 - [FIX]

What: Mark conversations as message-hydrated after the backend responds, including successful empty histories and unavailable-conversation tombstones. Applied the existing `conversation_connections` migration to the verified ROAS production database.

Why: Empty meeting chats stayed on loading skeletons forever, while the missing Connections table caused repeated production 500s during initial chat load.

Impact: Successfully fetched empty chats now render their empty state, and production chat Connections requests no longer fail because of a missing table.

Files: `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/store/use-chat-store.ts`, `supabase/migrations/20260820020000_conversation_connections.sql`, `documentation/features/claude-chatgpt-shell.md`
