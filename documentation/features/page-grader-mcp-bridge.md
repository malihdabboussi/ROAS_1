# Page Grader MCP bridge

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
Before creating work, Pixel resolves or confirms the client and campaign. For a
new campaign or launch, it retrieves existing Brain, Space, and Page Grader
context before asking only for details that block a safe draft. It never
invents the offer, objective, audience, timing, or source assets.
Pixel must not claim that a request was delegated or created until the tool
response confirms a durable result. A missing server, unresolved target, or
failed write is reported as a blocker rather than described as completed.

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
  regardless of the ambient ROAS campaign.
