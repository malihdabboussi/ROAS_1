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
The global selector uses the Clients list pipeline rules: inactive, blocked, and churned clients are hidden by default, but remain discoverable through selector search. Its client rows scroll independently beneath the fixed header and search field.
When scoped, the compact trigger shows one selected client and the selected client is pinned immediately below **All clients** in the menu.

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
- 2026-08-24: Recents cache entries are partitioned by selected client. Both fetched and live-store conversations are matched against direct client ids, the Client Workspace campaign, and every mapped Campaign Space; unattributed or mismatched chats fail closed.
- 2026-08-24: Client Campaigns and Launches clear previous-scope rows before loading a newly selected client.
- 2026-08-25: The global selector became searchable and independently scrollable, with inactive clients hidden by the canonical Clients list pipeline rules unless searched.
- 2026-08-25: The selected selector trigger uses a compact count, while the selected client name stays visible as the first client row beneath **All clients**.

Last Modified: 2026-08-25
