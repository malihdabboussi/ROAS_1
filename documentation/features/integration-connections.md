# Integration Connections

Last Modified: July 24, 2026 (Higgsfield native MCP OAuth)

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
14. Normal Manage People and Channels loads are database-first. The explicit Refresh Slack action discovers workspace users, channels, and memberships, persists every non-bot identity in `channel_members`, and refreshes the Slack observation index without making page mounts fan out across Slack APIs.
15. Team → People reads those organization-owned records for admins. Unresolved identities remain durable ghost profiles so later platform-user or Customer Brain contact matches do not lose their history.
16. Proactive Slack messages and discovered workflows use `slack_shadow_actions` as their review ledger. Admins can create a harmless test proposal, approve or dismiss it, and send it only after both approval and an explicit switch of that person to `active`. Creating or reviewing a proposal never sends it.
17. Page Grader can expose the Meta account, Page, pixel, and campaign identifiers already mapped to a client through a read-only client Meta context endpoint. Vibey uses its stored Page Grader connection to proxy this context for launch preparation; Page Grader credentials and Meta tokens never enter the response.
18. Native Slack connections resolve only inside the active account scope. A personal Slack row cannot make an organization appear connected, supply its runtime token, or receive organization-scoped metadata/error updates.
19. The Team flyout links directly to Manage People. Team → People uses URL-backed screens for the roster, Conversations (mail-style left chat list + right Slack/Shadow thread), Signals (channel-level findings list + detail), and each person's identity panel, so opening a person or proposal replaces the main People content and browser Back returns to the roster.
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
31. Team → People exposes People, Conversations, Signals, Teammates, and Calendars as peer views. Post-call delivery drafts are stored in the same `slack_shadow_actions` ledger as manual Shadow proposals, so admins can reach the proposal globally or through the matched person and see the exact text that approval will deliver. Channel-level workflow/risk proposals without a recipient open under Signals.
32. Org Google Workspace is a separate org-shared integration (`google_workspace`) from personal Composio Google Calendar. Admins connect a domain-wide-delegation service account and Sync Directory from Integrations; calendar identity review and Team Agenda approval live in Team → People → Calendars. Directory sync is the only source of calendar identities (Workspace domain users). Slack/portal emails link onto those Directory rows when they match — external Slack contacts are never added as identities. Delegation readiness lives in People → Teammates (and on a portal-linked person’s Team tab). Org Settings → Team only deep-links to People. Agents use `get_person_agenda`, `list_org_upcoming`, and `get_person_briefing`; member Home Agenda stays caller-scoped (Mine), with admin Team scope over confirmed Directory people **plus** the caller’s personal Composio calendars.
33. Home Agenda exposes a **Mine | Team** toggle for org admins when Workspace is available. Mine is the existing personal Composio agenda. Team loads confirmed Directory Workspace calendars via `GET /api/integrations/calendar/agenda?scope=team`, merges the caller’s personal Composio events labeled **Mine**, then runs the same personal Meetings enrichment (`prep`, `related` Fathom/calls, unmatched Fathom rows). Team connected state also probes `/api/integrations/google-workspace/status` so a connected Workspace row is never shown as “not connected yet”.
34. An organization admin can start a bounded Person Brain backfill for enabled Slack Brain channel mappings. The backfill provisions missing managed User Brains for non-portal Internal/External people, excludes Ignored people and DMs, and queues sender-filtered historical channel imports through the existing retryable Brain import runtime. Recurring ISO cursors are normalized to Slack timestamps before history retrieval.
35. Home Agenda **Call recording & tasks** attaches a Fathom/Meetings call with confident match first: call_date overlap (±45m) + exact email overlap (or strong title confidence), exclusive 1:1. When AI titles / missing emails prevent that, a second pass attaches the call only if exactly one calendar invite starts within ±10m and no other unmatched call competes. Unmatched Fathom rows are still injected when no sole invite exists; Team/personal agenda then merges those leftovers onto the unique nearby calendar row. Opening the recording uses the Fathom URL when present; follow-ups navigate to `/spaces?space=&item=` (not the legacy `/spaces/:id/:itemId` path, which 404s).
36. On Team agenda, account labels prefer teammate calendar names. **Mine** is only kept when the row exists solely on the caller’s personal calendar; **Fathom** is only kept for unmatched Fathom-only rows (the Fathom badge still appears via `source` / related). Shared Mine+teammate invites drop Mine.
37. A successful Fathom reconnect restores only automation routes that the matching Fathom disconnect disabled. Routes disabled manually or for another error remain disabled.
38. Inbound Slack Pixel requests are fail-closed against Manage People before files, credits, or agent tools run. `internal` people use the Slack integration owner's organization context and credits even without a portal account; `external`, `ignored`, unresolved, and identity-check failures never invoke the agent. Non-DM channels are usable only when every human member is Internal. The Slack OAuth installer is the owner; only that identity may retain Personal Brain access. Every other Internal person is blocked from direct and indirect Personal Brain tools at both prompt assembly and tool execution.
39. Higgsfield connects natively through OAuth 2.1 authorization code + PKCE against `https://mcp.higgsfield.ai/mcp`. The visible `user_integrations` row contains status only; the durable access/refresh token bundle lives in `vault_secrets` and the linked `project_mcp_servers` row is shared and agent-enabled. Agent runtime refreshes expiring access tokens before Slack or mission tool execution.
40. Inbound Slack files tolerate Slack's abbreviated event payloads: when an event contains only a file id, Pixel resolves the complete file with `files.info` before downloading and passing the native image/document to the agent. Forwarded Slack message unfurls are normalized into message context, and Pixel loads recent discussion from the referenced source channel when the installed bot can read it.

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

- Fathom reconnect is responsible for reversing its own disconnect side effects. Reactivation is restricted to routes whose stored disable reason exactly matches the Fathom disconnect reason, so reconnect cannot silently enable intentionally disabled automations.
- Higgsfield is a native MCP integration, not a Composio toolkit. OAuth authorization is resource-bound to the exact Higgsfield MCP URL, credentials stay in the vault, and MCP connection pooling includes a token fingerprint so two workspaces can never reuse one another's authenticated transport.
- A generic `connected` badge is not enough. The product must answer whether this agent can use this integration right now.
- Personal and org-shared connections are separate scopes. A personal fallback requires explicit user approval for the current task.
- Personal-account Google Calendar and Outlook follow the same private cross-context pattern as Fathom/Page Grader: usable by you inside an org, never visible to teammates, never auto-shared. Shared allowlist lives in `personal-cross-context-providers.ts` (status + calendar + overview; Slack remains overview-only projection).
- Org Google Workspace (`google_workspace`) is not personal OAuth and is not `org_shared` on a member's Google Calendar. It uses a vaulted service account with Domain-Wide Delegation (readonly Directory + Calendar). `org_person_calendar_identities` is Directory-scoped (internal Workspace users only); Slack/portal matching only attaches to existing Directory emails. Identity list, confirm/reject, and Team Agenda DWD fetches all require `directory_sync` or a Workspace user id — Slack-only / manual / external rows are pruned and never pulled. Identity review UI is People → Calendars; Integrations Org keeps connect/sync only. Person agendas resolve for admins and agents; Home Agenda Mine stays caller-scoped Composio calendars, Team is admin-only over confirmed Directory people plus the caller's personal Composio calendars (Mine).
- Exact email is the only automatic person↔calendar match. Fuzzy matches are never silent — admins confirm or reject suggestions (same pattern as Slack identity suggestions).
- Home Agenda **Mine | Team** is admin-only. Team = confirmed Workspace Directory teammate calendars **plus** the caller's personal Composio calendars (labeled **Mine**). Team reuses the personal Meetings enrichment pipeline (Fathom related calls + prep docs keyed by calendar event id). Workspace `connected` follows the org connection row; vault readiness is separate so Team Agenda does not look uninstalled when credentials exist under the connecting admin. Non-Directory people are never DWD-pulled.
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
- Personal and Team Agenda collapse the same invite across calendars/accounts using Google `iCalUID` / Outlook uid, shared video link + start, normalized title, near-duplicate title similarity / shared attendees within ±10m, and Fathom-only rows onto the unique nearby calendar invite. The calendar row wins; Fathom contributes `related` / recording. Team labels prefer teammate names over Mine/Fathom.
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
- People detail, Conversations, and Signals are durable URL-backed screens inside Team, not inline panels. Conversations is a left chat list + right thread pane (real Slack + Shadow merged); Signals is a left findings list + right approve/dismiss pane; person detail keeps the identity/intelligence panel.
- A People conversation composer writes only to `slack_shadow_actions`; delivery remains a separate approved-and-Active action. Explicit identity mapping is limited to active members of the current organization.
- A created Person Brain replaces the creation action in the person intelligence panel; portal identity remains a separate optional mapping. The right-side person panel can collapse to a narrow rail and reopen without leaving the conversation.
- Slack channel membership is display-only discovery context. Only channels visible to the connected bot are shown, and a refresh must preserve every administrator-set `internal`, `external`, or `ignored` classification because manual relationship metadata remains authoritative.
- Manage People relationship classification is the Slack Pixel authorization source. Internal Slack Connect identities can be manually classified Internal; portal membership is not required. External, Ignored, and unresolved identities receive a short denial. Mixed channels are denied so an Internal sender cannot expose organization context to a client who can see the thread.
- Slack teammate execution is owner-funded but not owner-impersonated for private memory. The request uses the integration owner's organization/credits, carries the Slack principal through channel context, strips Personal Brain prompt/tool access for non-owners, and rejects Slack calls that omit this principal contract.
- A forwarded Slack card is context, not ordinary link-preview decoration. Pixel preserves its author, channel, message, links, and source permalink, then reads the referenced channel through the existing Slack connection when authorized. Abbreviated file events must be hydrated through Slack before the file is considered unavailable.
- Page Grader is discovery context, not a second Meta publisher. Vibey owns Mission approvals, Meta mutations, and audit history. When Page Grader has exactly one active mapped ad account it may recommend that identifier; multiple active accounts require a human selection.
- Paid Ads must expose connection and campaign-mapping state before launch. A Page Grader recommendation is labeled as context, not permission; only a live Meta connection plus explicit ad-account and Page selection earns the `Meta mounted` state.
- Paid Ads creation and reporting are modes of one workspace, not separate setup flows. The standalone Ads Performance view remains available for custom reporting layouts, but the normal Paid Ads workflow switches modes in place.
- Blaze owns Paid Ads performance review. Analysis handoffs carry selected campaign snapshots and never invoke the Meta publishing selector; lead-generation campaigns are judged by their actual result type and cost per result rather than purchase ROAS alone.
- Page Grader Client Intel packages sync into mapped ROAS campaign brains via deterministic dual-write (not Atlas LLM). Continuous sync is hybrid: PG webhook push + ROAS hourly catch-up + manual Re-sync; skip when package `content_hash` is unchanged.
- Slack Person Brain backfill is limited to enabled, explicitly mapped channels. It does not read DM history or silently attach a Slack identity to a portal user. Portal teammates continue routing to their canonical User Brain; Slack-only people route to their managed Person Brain.
- Home Agenda related-call matching is exclusive: time overlap (±45m) + exact email overlap (or strong title confidence), then a sole near-start (±10m) fallback for AI-titled / email-poor Fathom rows. A shared organizer email alone must never attach another person's recording when title confidence is weak and multiple invites compete. Related open uses Fathom `recording_url` or `/spaces?space=&item=`; never the legacy `/spaces/:id/:item` page path.
