# Integration Connections

Last Modified: July 20, 2026 (Slack People channel context)

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
18. Native Slack connections resolve only inside the active account scope. A personal Slack row cannot make an organization appear connected, supply its runtime token, or receive organization-scoped metadata/error updates.
19. The Team flyout links directly to Manage People. Team → People uses URL-backed screens for the roster, the Shadow conversation inbox, and each person's Slack/Shadow history, so opening a person or proposal replaces the main People content and browser Back returns to the roster.
20. Slack People automatically links a unique active organization profile when the Slack email matches. A unique exact normalized full-name match is only a suggestion; an admin must confirm it before `vibey_user_id` or the accessible canonical User Brain is attached.
21. Person relationship (`internal`, `external`, or `ignored`) is independent from delivery mode (`off`, `shadow`, or `active`). Manual relationship choices survive later Slack refreshes.
22. Opening a person fetches that Slack direct-message history, including thread replies, and the person's Shadow ledger so admins can see where approved sends land. The chronological timeline labels actual Slack messages versus Shadow samples/proposals, shows timestamps and proposal rationale, renders Slack formatting, and places agent messages left with human replies right. The roster defaults to cards and can switch to a list with inline relationship, delivery, and Brain controls. DM history is not automatically ingested.
23. Manage People mirrors the Manage Agents interaction model: the directory is a visual card roster, and opening a person replaces it with a full-height agent-to-human Shadow conversation plus a right-side identity/intelligence panel. Admin-authored messages enter the proposal ledger and never send from the composer.
24. The People intelligence panel lists active portal members and lets an admin explicitly map an unmapped Slack identity after backend membership validation. Alternatively, Create new Person Brain atomically creates an organization-managed, non-default User Brain for that Slack identity without creating a fake portal account. Internal/external is relationship metadata; Customer Brain and campaign knowledge may link to an external person later without becoming the person's identity store. Mapping a portal teammate connects their already-accessible canonical User Brain.
25. Page Grader client → campaign mapping supports continuous hybrid sync: deterministic package ingest into campaign `ns_memories` + Campaign Knowledge, push webhook after Client Intel refresh, hourly ROAS catch-up, and manual Re-sync (Map clients + Brain canvas). See `documentation/features/page-grader-campaign-brain-sync.md`.
26. A small allowlist of personal-account integrations (`org_id IS NULL`) remains usable by the owning user inside an org: Fathom, Fireflies, Page Grader, OpenAI Codex, Anthropic Claude, Google Calendar, and Outlook. Overview may also project personal Slack into Manage; status/runtime still treat Slack as org-scoped only. Calendar Agenda and status resolve the caller's personal calendar row in org context; teammates never receive another user's personal-account rows.
27. Paid Ads views show a persistent Meta setup bar. Page Grader may recommend the mapped client ad account, but the view remains in draft mode until ROAS has a live Meta connection and the campaign has both a Meta ad account and Facebook Page mounted. Those selections persist in campaign `meta_defaults` and the default Meta asset profile used by launch flows.
28. The Paid Ads view is one workspace with `Analyze` and `Launch` modes. Analyze is the default unless the user previously saved a mode. Both modes reuse the same Meta connection and campaign asset mapping. Launch manages campaigns, ad sets, ads, and publishing; Analyze syncs existing Meta ads and shows performance without sending the user to a separately configured view.
29. Analyze uses Meta's campaign result actions, including completed registrations and purchases, instead of treating every campaign as a lead or purchase campaign. AI Analysis uses the exact visible reporting period, lets the user select campaigns, and opens a fresh Blaze chat with a read-only performance snapshot. Ads Manager links include both the selected object and mapped ad account.
30. Each People refresh reads membership for Slack channels visible to the connected bot and attaches the sorted channel names to the matching people response. Cards, list rows, search, and the person detail panel use that context to identify unfamiliar people without persisting or changing relationship classifications.
31. Team → People exposes People and Conversations as peer views. Post-call delivery drafts are stored in the same `slack_shadow_actions` ledger as manual Shadow proposals, so admins can reach the proposal globally or through the matched person and see the exact text that approval will deliver.

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
- Personal-account Google Calendar and Outlook follow the same private cross-context pattern as Fathom/Page Grader: usable by you inside an org, never visible to teammates, never auto-shared. Shared allowlist lives in `personal-cross-context-providers.ts` (status + calendar + overview; Slack remains overview-only projection).
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
- A Slack identity is not automatically a platform account. `channel_members` is the durable provider identity; `vibey_user_id` links a managed teammate, `person_brain_id` links an organization-managed User Brain, `contact_id` may link external/customer context, and an unmatched row remains a ghost profile.
- Slack people are organization-owned for admin visibility even though one organization member owns the OAuth connection and sync cursor.
- Library `is_active` is the connectability gate: providers without a ROAS native connect path or Composio toolkit `auth_config_id` stay visible as Coming Soon instead of offering a Connect that fails (e.g. Gmail until toolkit config is seeded).
- Native Slack does not inherit a personal connection inside an organization. Each organization must complete its own OAuth connection so Settings, runtime actions, and Team → People share the same workspace-scoped truth.
- Shadow Mode is the safe default for proactive outreach. `off` blocks proposal creation, `shadow` permits review without delivery, and `active` permits an admin to explicitly send only an approved ledger record. Sending atomically claims the approved record before Slack delivery so concurrent requests cannot both send it; failed deliveries remain visible as `failed`. Automated observation and proposal generation remain separate follow-up work.
- Manage People must distinguish the current review-layer capability from future automatic proposal discovery. A test proposal is a sample draft, and `active` only unlocks the explicit Send now action; it does not autonomously send.
- Email remains the only automatic Slack-to-portal identity match. Exact unique name matching is a 0.95-confidence review suggestion because a false positive would attach the wrong person's User Brain.
- Internal/external/ignored classification and off/shadow/active delivery are separate controls. `ignored` blocks new proposals; `shadow` keeps drafts in-platform; `active` permits only explicit delivery of an approved draft.
- Person activity is a review surface over actual Slack DMs and thread replies plus Shadow records. Creating a Slack-only Person Brain establishes a distinct organization-managed User Brain; automatic DM ingestion still requires a separate consent, access, ingestion, and retention design.
- Slack reaction confirmation is ROAS-owned. A configured checkmark reaction marks the follow-ups approved in ROAS and posts an acknowledgment in the originating Slack thread; it does not dispatch work to Page Grader.
- People detail and Shadow review are durable URL-backed screens inside Team, not inline panels. This prevents roster scroll jumps, gives browser navigation predictable behavior, and provides one Shadow conversation hub for all proposal targets.
- A People conversation composer writes only to `slack_shadow_actions`; delivery remains a separate approved-and-Active action. Explicit identity mapping is limited to active members of the current organization.
- A created Person Brain replaces the creation action in the person intelligence panel; portal identity remains a separate optional mapping. The right-side person panel can collapse to a narrow rail and reopen without leaving the conversation.
- Slack channel membership is display-only discovery context. Only channels visible to the connected bot are shown, and a refresh must preserve every administrator-set `internal`, `external`, or `ignored` classification because manual relationship metadata remains authoritative.
- Page Grader is discovery context, not a second Meta publisher. Vibey owns Mission approvals, Meta mutations, and audit history. When Page Grader has exactly one active mapped ad account it may recommend that identifier; multiple active accounts require a human selection.
- Paid Ads must expose connection and campaign-mapping state before launch. A Page Grader recommendation is labeled as context, not permission; only a live Meta connection plus explicit ad-account and Page selection earns the `Meta mounted` state.
- Paid Ads creation and reporting are modes of one workspace, not separate setup flows. The standalone Ads Performance view remains available for custom reporting layouts, but the normal Paid Ads workflow switches modes in place.
- Blaze owns Paid Ads performance review. Analysis handoffs carry selected campaign snapshots and never invoke the Meta publishing selector; lead-generation campaigns are judged by their actual result type and cost per result rather than purchase ROAS alone.
- Page Grader Client Intel packages sync into mapped ROAS campaign brains via deterministic dual-write (not Atlas LLM). Continuous sync is hybrid: PG webhook push + ROAS hourly catch-up + manual Re-sync; skip when package `content_hash` is unchanged.
