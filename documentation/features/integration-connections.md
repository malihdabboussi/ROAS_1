# Integration Connections

Last Modified: July 19, 2026 (Page Grader Meta context bridge)

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
13. Canva handoffs use the selected personal or org-shared Composio connection. Images follow Canva's asset-upload path; documents and presentations send native DOCX, PPTX, or PDF bytes through Canva Design Import and poll until an editable design URL is ready.
14. Organization Slack refreshes persist every non-bot workspace identity in `channel_members`, including its email, resolved platform user or external contact, relationship kind, and per-person delivery mode.
15. Team → People reads those organization-owned records for admins. Unresolved identities remain durable ghost profiles so later platform-user or Customer Brain contact matches do not lose their history.
16. Proactive Slack messages and discovered workflows use `slack_shadow_actions` as their review ledger. Admins can create a harmless test proposal, approve or dismiss it, and send it only after both approval and an explicit switch of that person to `active`. Creating or reviewing a proposal never sends it.
17. Page Grader can expose the Meta account, Page, pixel, and campaign identifiers already mapped to a client through a read-only client Meta context endpoint. Vibey uses its stored Page Grader connection to proxy this context for launch preparation; Page Grader credentials and Meta tokens never enter the response.

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
- Canva documents and presentations use native Design Import rather than flattening the whole artifact into an image. Standard docs become DOCX, visual docs become high-resolution PDF, and presentations become PPTX with editable text, shapes, and embedded images where the source format allows it.
- A Slack identity is not automatically a platform account. `channel_members` is the durable provider identity; `vibey_user_id` links a managed teammate, `contact_id` links an external person into Customer Brain, and an unmatched row remains a ghost profile.
- Slack people are organization-owned for admin visibility even though one organization member owns the OAuth connection and sync cursor.
- Shadow Mode is the safe default for proactive outreach. `off` blocks proposal creation, `shadow` permits review without delivery, and `active` permits an admin to explicitly send only an approved ledger record. Sending atomically claims the approved record before Slack delivery so concurrent requests cannot both send it; failed deliveries remain visible as `failed`. Automated observation and proposal generation remain separate follow-up work.
- Page Grader is discovery context, not a second Meta publisher. Vibey owns Mission approvals, Meta mutations, and audit history. When Page Grader has exactly one active mapped ad account it may recommend that identifier; multiple active accounts require a human selection.
