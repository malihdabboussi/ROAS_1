# Page Grader and ROAS operations convergence

## Product ownership

- ROAS is the primary fulfillment application: client workspaces, campaign Spaces, task execution, Pixel chat, performance, meetings, and Brain context.
- Page Grader remains the onboarding/kickoff application and the isolated home for team micro-tools.
- ClickUp remains the operational task mirror during the transition. Page Grader owns the ClickUp workspace mapping and department routing.

## User-facing surfaces

### Launches

`/launches` opens the monthly calendar by default. Ad launches are green, event dates are blue, onboarding calls are purple, and the optional asset-due overlay is red. Selecting an item opens the shell's right artifact rail. Add Launch writes the selected client, campaign, launch date, and optional event date back through Page Grader.

### Clients and campaigns

`/clients` uses the Page Grader operational client inventory, including status and manager data. `/client-campaigns` uses Stage, Date Created, Client Name, Campaign Name, Type, Owner, Launch Day, Created By, and Options. Campaign rows open their mapped ROAS Space; status changes and options write through Page Grader.

A Page Grader campaign Space uses the native ROAS Space views and task modal. Its Overview is campaign-specific and shows:

1. campaign requests/tasks;
2. the mapped Meta performance snapshot; and
3. best-performing ads restricted to linked Meta campaign IDs.

### Command-K and creation

The idle palette shows recent clients, then navigation, then Create actions. Search ordering is Clients, Campaigns, Requests, and Chats. New Campaign and New Service Request start a new Pixel conversation with a guided prompt. Pixel's shared platform policy routes campaign drafts and fulfillment requests through the live Page Grader MCP, matching Slack Pixel's tool path and durable review-link behavior.

## Task synchronization contract

Each active Page Grader `workload_tasks` row maps to one native ROAS `space_items` row:

- campaign task -> mapped campaign Space;
- client-wide task -> hidden General Space;
- Page Grader identity -> `custom_data.page_grader_work_id`;
- ClickUp identity -> `custom_data.clickup_task_id`;
- reverse mapping -> Page Grader `workload_tasks.roas_space_item_id`.

ROAS task changes call the signed Page Grader agency API. Page Grader updates ClickUp first and only confirms the local mutation when the ClickUp operation succeeds. Comments are posted to ClickUp with a ROAS author byline and then rehydrated.

ClickUp webhooks hydrate canonical comments, attachments, task fields, and activity in Page Grader. For a mapped task, the webhook sends a signed refresh to `POST /api/integrations/page-grader/webhooks/work-status`. ROAS re-fetches the client task inventory and full task thread, updates `space_items`, and replaces ClickUp-mirrored `space_item_activity` rows. Existing Supabase realtime subscriptions then update the open Space list and task activity UI.

Missed webhook events are repaired when ROAS loads the client workspace, campaign Overview, or task detail. This makes the webhook the fast path and reconciliation the correctness backstop.

## Security and failure behavior

- Browser clients never receive the Page Grader API key or webhook secret.
- All agency API requests are server-side and use the user's stored Page Grader connection.
- Inbound task refreshes require the signed Page Grader webhook secret and must match both the mapped client and native task identity.
- ClickUp or Page Grader failures are surfaced as failed mutations; the native row is not presented as successfully synchronized.
- Attachments remain externally hosted and read-only in ROAS; they render through the native task file preview.
