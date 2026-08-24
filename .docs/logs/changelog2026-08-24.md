# Changelog - August 24, 2026

## 2026-08-24 10:21 - [FIX]

What: Mark conversations as message-hydrated after the backend responds, including successful empty histories and unavailable-conversation tombstones. Applied the existing `conversation_connections` migration to the verified ROAS production database.

Why: Empty meeting chats stayed on loading skeletons forever, while the missing Connections table caused repeated production 500s during initial chat load.

Impact: Successfully fetched empty chats now render their empty state, and production chat Connections requests no longer fail because of a missing table.

Files: `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/features/studio/store/use-chat-store.ts`, `supabase/migrations/20260820020000_conversation_connections.sql`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-24 14:20] - [FIX]

What: Added a campaign-scoped Chats & Missions tab to Page Grader client workspaces, opened chats in the shared chat drawer and missions in the shared detail surface, and removed the overview's raw Slack-message card and retired `/chat?campaign=…` link.

Why: The overview exposed raw Slack emoji shortcodes and sent Open client conversations to a route that no longer exists.

Impact: Client communication and mission history now has a dedicated working surface, emoji-only titles receive a readable fallback, and the client overview no longer contains a dead navigation action.

Files: `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `apps/web/src/features/agency-clients/AgencyClientChatsMissionsPanel.tsx`, `apps/web/src/features/agency-clients/AgencyClientWorkspaceOverview.tsx`, `apps/web/src/features/agency-clients/config/messages.config.ts`, focused tests, and `documentation/features/page-grader-campaign-brain-sync.md`.

## 2026-08-24 14:14 - [FIX]

What: Restored the Attendees column after Host in All Meetings, made Client Workspace and Campaign Space open the shared client/campaign picker, added each client's General workspace to that picker, and added a conservative historical backfill for uniquely matched client calls.

Why: Existing meeting rows showed blank workspace columns that could not be edited, the All Meetings view no longer exposed its stored attendee data, and historical calls had never received the new client/campaign mapping.

Impact: Operators can manually map a call from either visible workspace column without moving it. Existing schemas and templates regain Attendees without resetting custom column order. The migration fills 38 currently unmapped calls whose titles identify exactly one real client and leaves ambiguous rows blank for manual selection.

Files: `apps/web/src/components/spaces/cells/ClientCampaignCell.tsx`, `apps/web/src/components/spaces/cells/SpaceFieldIdCell.tsx`, `apps/web/src/components/work-views/AllMeetingsNativeList.tsx`, `apps/web/src/lib/agency-clients/client-campaign-mapping.ts`, `apps/web/src/lib/agency-clients/use-client-campaign-groups.ts`, `apps/web/src/lib/spaces/all-meetings-list-columns.ts`, `supabase/migrations/20260824213000_meetings_workspace_attendees_backfill.sql`, `documentation/features/meeting-follow-up-slack.md`, `documentation/features/space-templates.md`, `documentation/utilities/all-meetings-list-columns.md`, `documentation/utilities/README.md`, `documentation/frontend-shared-surfaces.md`

## 2026-08-24 13:18 - [FIX]

What: Changed primary sidebar navigation to open destination cards without AI Chat, preserved conversation-specific detailed artifact restoration and artifact pinning, and made New chat open beside card-only workspaces or full-screen when chat is already visible. Removed the obsolete per-screen remembered-chat prompt and persistence slice.

Why: Inbox, Meetings, All Tasks, Clients, and related destinations inherited an open chat pane, while New chat did not consistently respect whether the user was viewing a card or an active conversation.

Impact: Destination cards now open alone. Conversation selection still restores its saved detailed artifact; pin keeps the visible artifact fixed while browsing chats without changing saved associations.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/shell/use-shell-workspace-screen-chat.ts`, related shell/sidebar tests, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-24 11:15] - [STYLE]

What: Promoted Artifacts from the More flyout to a first-level main-menu destination immediately below Launches across simple, compact, advanced, and mobile navigation variants.

Why: Artifacts is a primary agency destination and should be directly accessible without opening More.

Impact: Users can open All Artifacts from the main menu in one action, while More now contains only its remaining secondary destinations.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/manage-rail-items.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqHubMenuContent.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMoreFlyoutBody.tsx`, and focused sidebar tests.

## 2026-08-24 13:23 - [FIX]

What: Named new MCP conversations from the registered OAuth client and invoked tool, persisted the client logo identity, rendered that logo or a plug fallback in Recents, and added a migration that numbers historical `MCP session` rows per client.

Why: MCP-created conversations were indistinguishable because every row had the same hardcoded title and the sidebar ignored their existing MCP source metadata.

Impact: New rows read like `Claude · Synthesize User Brain Topic`, MCP activity overlays a recognizable client identity, and historical rows receive unique names such as `Claude · MCP call 17` plus the best available client identity instead of remaining blank generic sessions.

Files: `apps/api/src/modules/mcp/repositories/mcp-oauth.repository.ts`, `apps/api/src/modules/mcp/services/mcp-oauth.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-session.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-token-introspection.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-server.service.ts`, `apps/agent-api/src/modules/vibey-mcp/types/vibey-mcp.types.ts`, `apps/web/src/components/conversations/ConversationRowLeadingIcon.tsx`, `apps/web/src/lib/conversations/conversation-activity.ts`, `supabase/migrations/20260824133000_backfill_mcp_conversation_identity.sql`, `documentation/features/claude-chatgpt-shell.md`
