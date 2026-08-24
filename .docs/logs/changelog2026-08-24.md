# Changelog - August 24, 2026

## 2026-08-24 10:21 - [FIX]

What: Mark conversations as message-hydrated after the backend responds, including successful empty histories and unavailable-conversation tombstones. Applied the existing `conversation_connections` migration to the verified ROAS production database.

Why: Empty meeting chats stayed on loading skeletons forever, while the missing Connections table caused repeated production 500s during initial chat load.

Impact: Successfully fetched empty chats now render their empty state, and production chat Connections requests no longer fail because of a missing table.

Files: `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/store/use-chat-store.ts`, `supabase/migrations/20260820020000_conversation_connections.sql`, `documentation/features/claude-chatgpt-shell.md`

## 2026-08-24 13:23 - [FIX]

What: Named new MCP conversations from the registered OAuth client and invoked tool, persisted the client logo identity, rendered that logo or a plug fallback in Recents, and added a migration that numbers historical `MCP session` rows per client.

Why: MCP-created conversations were indistinguishable because every row had the same hardcoded title and the sidebar ignored their existing MCP source metadata.

Impact: New rows read like `Claude · Synthesize User Brain Topic`, MCP activity overlays a recognizable client identity, and historical rows receive unique names such as `Claude · MCP call 17` plus the best available client identity instead of remaining blank generic sessions.

Files: `apps/api/src/modules/mcp/repositories/mcp-oauth.repository.ts`, `apps/api/src/modules/mcp/services/mcp-oauth.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-session.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-token-introspection.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-server.service.ts`, `apps/agent-api/src/modules/vibey-mcp/types/vibey-mcp.types.ts`, `apps/web/src/components/conversations/ConversationRowLeadingIcon.tsx`, `apps/web/src/lib/conversations/conversation-activity.ts`, `supabase/migrations/20260824133000_backfill_mcp_conversation_identity.sql`, `documentation/features/claude-chatgpt-shell.md`
