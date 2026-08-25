# Client Scope

`@/lib/client-scope` is the shared application-wide client isolation contract.

## Data Flow

1. `ClientScopeProvider` reads the `client` URL parameter or the organization-scoped persisted selection.
2. It loads the Page Grader client catalog and selected client workspace.
3. `resolveClientScope` maps the selected client to its ROAS Client Workspace campaign and every Campaign Space.
4. Scope-aware surfaces filter by direct client id, Client Workspace campaign id, or Campaign Space id.
5. Internal navigation retains the `client` parameter. Clearing the selector removes both URL and persisted scope.

Unattributed records remain visible under **All clients** and are excluded from a selected client.
While a selected client is resolving, the provider fails closed and does not render unscoped workspace data. Stale workspace mappings are discarded before a different client resolves.

## Consumers

- Shell Recents and new-chat campaign context
- Inbox
- Meetings
- All Tasks
- Clients and Client Campaigns
- Launches
- Artifacts

## Decision Log

- 2026-08-24: Client scope uses the external Page Grader client id as its URL identity while resolving internal ROAS campaign and Space ids for filtering.
- 2026-08-24: Recent artifacts remain conversation-owned. Switching to a client that excludes the active conversation closes that conversation; the existing shell artifact sync preserves only explicitly pinned artifacts.
- 2026-08-24: Client changes fail closed during mapping resolution so delayed or invalid selections cannot expose another client's data.
- 2026-08-24: Recents cache entries and live-store merges are partitioned by selected client campaign to prevent cross-client flashes during refresh.
- 2026-08-24: Client Campaigns and Launches clear previous-scope rows before loading a newly selected client.

Last Modified: 2026-08-24
