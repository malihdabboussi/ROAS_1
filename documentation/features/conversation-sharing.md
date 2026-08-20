# Conversation Sharing

Last Modified: 2026-08-19

## Overview

Conversation sharing makes conversations private by default. The creator keeps admin access, the main conversation list shows only the current user's own conversations, and explicit shares grant other users permission to view or edit.

## Permission Levels

- `view`: read conversation and messages.
- `edit`: `view` plus send messages, rename, archive, move, and message metadata updates.
- `admin`: `edit` plus manage shares and delete the conversation.

## Data Flow

1. New chat drafts stay local until the first message send; persisted conversations are inserted into `conversations` with `user_id` as owner and optional `org_id`.
2. Explicit grants are stored in `conversation_shares`.
3. Supabase RLS calls `conversation_effective_level(conversation_id, auth.uid())`.
4. `GET /api/conversations` lists only conversations owned by the authenticated user in the active org/personal scope and excludes idle `team_draft` rows.
5. `GET /api/conversations/shared-with-me` lists only conversations explicitly shared with the authenticated user or active org.
6. API services call `ConversationPermissionsService.assertCanAccessConversation(...)` before read/write actions.
7. Spaces UI receives `effective_level` on conversation rows and disables write actions for read-only users.
8. Extra campaign/space links live in `conversation_connections`. `conversations.campaign_id` remains the primary connection (Slack channel-chat bind and named-client bind write that column). Read paths union `campaign_id` / `metadata.space_id` with table rows. `GET/POST /api/conversations/:id/connections` and `DELETE /api/conversations/:id/connections/:entityType/:entityId` add or remove one row; adding a campaign does not overwrite an existing primary.

## Backend Layer

- `apps/api/src/modules/conversations/services/conversation-permissions.service.ts` resolves and asserts effective levels.
- `apps/api/src/modules/conversations/controllers/conversations.controller.ts` exposes `GET/POST/DELETE /conversations/:id/shares`.
- `apps/api/src/modules/conversations/controllers/conversation-connections.controller.ts` exposes `GET/POST /conversations/:id/connections` and `DELETE /conversations/:id/connections/:entityType/:entityId`.
- `apps/api/src/modules/conversations/repositories/conversations.repository.ts` lists owned conversations and explicitly shared conversations through separate query paths.

## Frontend Layer

- `apps/web/src/features/studio/services/chat.service.ts` exposes conversation share API helpers.
- `apps/web/src/features/spaces/components/chat/ConversationShareModal.tsx` manages user/org grants.
- `SpaceConversationActionsMenu` gates destructive and edit actions by `effective_level`.
- `SpaceVibeyChatPanel` disables the composer for `view` conversations.

## Decision Log

- 2026-05-03: Existing org conversations were not grandfathered into org-wide shares.
- 2026-05-03: Email invites and public links are out of scope for v1.
- 2026-05-10: Org owner/admin baseline access was removed from conversation listing and runtime access. Users see their own conversations in the main list; shared conversations require explicit `conversation_shares` rows.
- 2026-05-25: Empty chat drafts no longer appear in conversation lists. `New` selects a local blank composer, while the database row is created on first send and draft metadata is cleared after the first successful exchange.
- 2026-08-19: A conversation can have multiple Connections. `campaign_id` stays primary; extra campaigns/spaces are additive `conversation_connections` rows. Slack bind still writes only `campaign_id`.
