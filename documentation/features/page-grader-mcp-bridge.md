# Page Grader MCP bridge

Last Modified: 2026-08-17

## Ownership

- ROAS Platform is the brain, workflow controller, and agent surface.
- Page Grader is the portal and fulfillment data system.
- Slack is a conversational entry point into the same ROAS agent runtime.
- The `Page Grader` MCP server is the typed bridge between them.

When the Page Grader integration is connected, ROAS derives its MCP URL from
the connected `/roas-api` endpoint, stores the API key in the MCP vault, enables
the server for agents, and discovers its tools. Reconnecting updates the same
server instead of creating another registration.

## First tool surface

The initial server supports compact reads for clients, campaigns, fulfillment
tasks, meetings, client intel, and cached Meta reporting. Safe write tools create
campaign drafts, create fulfillment requests, and save sourced memories.

Every write requires an idempotency key. Page Grader audits each call. Campaign
draft creation does not publish Meta campaigns or start ad spend.

## Source precedence

1. Page Grader owns its portal records and cached reporting.
2. ROAS Brain owns synthesis, company knowledge, strategy, and durable agent
   reasoning.
3. When a Page Grader memory is created through MCP, Page Grader notifies the
   existing ROAS Brain webhook to refresh that client package.
4. Source metadata and content hashes prevent the same memory from bouncing
   between systems as a new fact.

## Delegation routing

Pixel resolves the named target before choosing an execution path:

- A human teammate receives a durable assigned ROAS task when the requested
  work does not belong to a specialized fulfillment system.
- A managed ROAS AI agent receives `ask_agent` or `delegate_to_agent`.
- A funnel, landing page, campaign page, or related fulfillment request uses
  the connected `Page Grader` MCP server even when the user names a human
  owner. Pixel resolves that person through Page Grader and includes them as
  the fulfillment assignee. It does not replace the request with a generic
  ROAS task or search the ambient campaign team.
- The user does not need to know or say “Page Grader.”
- An explicit request to “delegate to PageGrader” follows the same MCP path.
  Pixel lists that server’s live tools, follows the returned write schema, and
  calls the selected tool through `use_mcp_tool`.

An explicitly named Page Grader client overrides ambient chat campaign context.
Before creating work, Pixel resolves or confirms the client and campaign across
the named client's own campaign Brain, Page Grader records, and matching Slack
channel or Space evidence. A missing result in the ambient campaign is not
evidence that the named client has no context. For a new campaign or launch,
Pixel asks only for details still missing after those sources are checked. It
never invents the offer, objective, audience, timing, or source assets.
Pixel must not claim that a request was delegated or created until the tool
response confirms a durable result. A missing server, unresolved target, or
failed write is reported as a blocker rather than described as completed.

## Delegation Desk

Spaces can capture selected work in a private **Delegation Desk** before it
reaches a teammate or fulfillment system. One intake batch preserves the source
Space and task ids, dispatch mode, user note, and a stable source fingerprint.
The Desk's `task_created` automation sends only top-level Holding tank items to
Pixel. Work Pixel creates in later statuses does not retrigger the intake
automation.

Pixel's `delegation-desk` skill reads every referenced item, checks existing
work, and creates the smallest clear set of work items. Related items may share
an optional parent work group, but each executable subtask keeps its own owner,
deadline, status, and completion record. Work may remain unassigned or unmapped
in Ready to delegate. Batch and Review first modes stop there; Urgent mode can
dispatch in the same run after client, destination, and duplicate checks.
Funnel, landing-page, campaign-page, and fulfillment work continues through the
Page Grader bridge described above, while the user sees **The ROAS Portal**.
Raw intake is never assigned directly to the team.

## User-facing language

`Page Grader`, `MCP`, tool names, schemas, idempotency keys, routing, retries,
and provider mechanics are internal implementation details. Pixel refers to
Page Grader as **The ROAS Portal** and the AI platform as the **ROAS platform**
in Slack and portal chat. It never exposes the internal `Page Grader` name in
user-facing responses.

Pixel does not narrate tool selection or execution between tool calls. Tool
progress is limited to structured status labels. The chat response contains one
concise confirmed result—what happened, who owns it, the relevant client or
campaign, and the next step—or one plain-language blocker.

## Production setup

1. Deploy the Page Grader migration and `page-grader-mcp` Edge Function.
2. Set Page Grader `ROAS_MCP_API_KEY` to the existing Page Grader integration
   key, or rotate both systems to a new dedicated value.
3. Confirm `ROAS_BRAIN_WEBHOOK_URL` and `ROAS_BRAIN_WEBHOOK_SECRET` remain set.
4. Deploy ROAS API and agent images.
5. Reconnect Page Grader once in ROAS Integrations. The response should show
   `mcp.connection_status=connected` and ten discovered tools.
6. Confirm the `Page Grader` MCP server is enabled and agent-enabled.
7. From a private internal Slack test thread, ask Pixel for one known
   Page Grader-only campaign fact and one cached Meta result.
8. Create a test campaign draft with a unique Slack event id, retry it, and
   verify that only one campaign exists.

## Acceptance checks

- Pixel can distinguish two similarly named clients.
- A Page Grader-only campaign question is answered with its record and update
  time.
- An ads question includes reporting range and snapshot age.
- A repeated action creates one record.
- Every call appears in `page_grader_mcp_audit_log`.
- A saved memory causes the mapped ROAS Brain package to refresh.
- No test publishes an ad or begins spend.
- PageGrader delegation creates an audited Page Grader record rather than a
  `delegate_to_agent` session.
- “I need this funnel built” routes to Page Grader without requiring the
  integration name, after client and campaign resolution.
- “Have Rafay build this funnel for Asura Group” creates Page Grader funnel
  fulfillment for the resolved Asura Group client with Rafay as the assignee,
  regardless of the ambient ROAS campaign. Pixel checks Asura Group's campaign
  Brain, Page Grader records, and accessible Slack channel context before asking
  the user for campaign information.
- Pixel's Slack reply says “The ROAS Portal” and “ROAS platform,” never `Page
Grader`, `MCP`, tool names, schemas, idempotency keys, or retry mechanics.
- Multi-tool fulfillment produces one concise final result instead of
  tool-by-tool narration.
- A five-task bulk delegation creates one private intake batch, preserves all
  source ids, and produces the smallest coherent set of work items instead of
  five automatic team assignments.
- Urgent Delegation Desk intake dispatches only after duplicate, target, and
  destination checks and stores the confirmed destination receipt.
- Service Request fulfillment creates from a ROAS / Slack Pixel session stamp
  that conversation UUID onto the draft (`source_context.conversation_id` plus
  internal post-create stamp). Public `/request-review/:token` resumes that
  same chat host; missing stamps backfill from Slack channel+thread provenance
  when uniquely resolvable.
- Review finalize cards render **in the Pixel thread** immediately under the
  pasted `/request-review/` URL (shared `WorkRequestChatResumeCard`). The public
  host keeps one composer. Signed-in `/home?conv=&wr=` seeds that conversation
  from the token chat API when the home pane would otherwise stay blank.
