# Integration Connections

Last Modified: July 16, 2026 (multi-account Agenda merge + personal default for sends)

## Data Flow

1. Users connect integrations through Settings or an agent repair card.
2. Composio-backed connections store a `user_integrations` row with scope, status, agent access, and Composio account metadata.
3. Connect flows reuse an existing active Composio account when possible instead of forcing another OAuth round trip, unless the client sends `force_new: true` (Library or Manage → “Add another account”).
4. Overview personal sync matches each Composio connected-account id to its own `user_integrations` row (never one-row-wins upsert by `integration_id`). Duplicate labels across distinct account ids are re-resolved with the identity tool for that account.
5. Connection labels are backfilled from provider identity tools (e.g. Google Calendar uses `GOOGLECALENDAR_LIST_CALENDARS` / account email — not Gmail profile).
6. Webhooks and status checks mark expired or inactive Composio accounts as `needs_reconnect`.
7. Agent connection checks resolve the exact usable connection for the current user, org, agent, and mission context.
8. PromptMode `use_integration` preflight validates `service`, exact `integration_action`, `params`, capability-required fields, and Composio connection readiness before provider execution.
9. The resolver returns one truth: `connected`, `status`, selected connection metadata, optional `connection_resolution`, optional `repair`, and `integration_doctor`.
10. Chat UI converts failed connection checks into an `integration_connect` block.
11. The repair card renders the doctor summary/checks and gives one or more actions: connect, reconnect, open settings, or approve a personal fallback for this task.
12. Composio execution failures also return `integration_doctor`, so the agent can explain and repair the failure instead of retrying a generic disconnected action.

## Code Examples

Connection check result:

```json
{
  "success": true,
  "integration_id": "google_drive",
  "connected": false,
  "status": "fallback_available",
  "connection_resolution": {
    "status": "fallback_requires_approval",
    "preferred_scope": "org_shared",
    "fallback_scope": "personal",
    "fallback_connection_id": "personal-connection"
  },
  "repair": {
    "status": "fallback_available",
    "primaryAction": {
      "type": "use_connection",
      "provider": "google_drive",
      "label": "Use personal Google Drive",
      "connectionId": "personal-connection"
    }
  },
  "integration_doctor": {
    "status": "fallback_available",
    "summary": "Google Drive is not ready in this workspace. Your personal Google Drive is connected, but I need your approval before using it for this task.",
    "checks": [
      {
        "label": "Workspace connection",
        "status": "fail",
        "detail": "The workspace connection is missing or not ready."
      },
      {
        "label": "Personal connection",
        "status": "pass",
        "detail": "Blake is connected."
      }
    ]
  }
}
```

Reconnect result:

```json
{
  "connected": false,
  "status": "needs_reconnect",
  "repair": {
    "status": "needs_reconnect",
    "primaryAction": {
      "type": "reconnect",
      "provider": "gmail",
      "label": "Reconnect Gmail"
    }
  },
  "integration_doctor": {
    "status": "needs_reconnect",
    "summary": "Gmail is connected in Vibey but the provider session expired."
  }
}
```

## Decision Log

- A generic `connected` badge is not enough. The product must answer whether this agent can use this integration right now.
- Personal and org-shared connections are separate scopes. A personal fallback requires explicit user approval for the current task.
- Multiple personal connections per integration are allowed; reuse is skipped when `force_new` is set.
- Overview must sync personal Composio accounts by `composio_connected_account_id`, not by collapsing to one account per `integration_id` (that stamped the newest account onto the wrong row and showed duplicate emails).
- Home Agenda merges events from every connected Google Calendar / Outlook account (not only the first). Events carry `account_label`; sending/invites use the personal or org `is_default` connection (star in Integrations).
- Library and Manage show the same connected-account list + “Add another account” for providers that already have a connection (Library is not Connect/trash-only once connected).
- Expired Composio accounts are treated as `needs_reconnect`, not silently kept as healthy connected rows.
- The repair-card action contract stays small: `connect`, `reconnect`, `open_settings`, and `use_connection`.
- `integration_doctor` is structured data for both the agent and UI. It should be included on connection checks and execution-gate failures.
- Settings remains the canonical place to manage integrations; chat repair cards are the fastest in-context repair path.
- Integration execution should fail before side effects when the agent uses an unavailable action slug, omits capability-required params, or the Composio connection is not ready for agent use.
- Google Calendar agenda reads events from all calendars in each connected Google account (capped per account, calendars fetched in parallel), not only `primary`.
- OAuth callback fallback lands on `/home` (settings is a modal), not `/settings`.
