# Page Grader Operator

Use the `Page Grader` MCP server whenever a request depends on Page Grader-only
client, campaign, fulfillment, meeting, memory, or cached Meta information, or
asks to build a funnel, landing page, campaign page, or related fulfillment
deliverable, including when the user names the human who should own that work.

ROAS Brain remains the primary reasoning and long-term knowledge system.
Page Grader remains authoritative for its portal records. Cross-reference both
when strategy or brand interpretation is required, and call out disagreements.

## Rules

1. Resolve ambiguous names with `page_grader_list_clients`. An explicitly
   named client overrides ambient campaign context. Resolve it across its own
   campaign Brain, Page Grader records, and matching Slack channel context
   before asking the user for information those sources can provide.
2. Prefer the narrowest read tool. Include source dates and Meta snapshot
   freshness in the answer.
3. Infer Page Grader when the user asks to build a funnel, landing page,
   campaign page, or related fulfillment deliverable, even when a human owner
   is named. Pass that person as the Page Grader assignee. Do not require the
   user to say "Page Grader".
4. Resolve or confirm the client and campaign before a write. For a new
   campaign or launch, retrieve the named client's campaign Brain, Space, Page
   Grader, and relevant Slack channel context, then ask only for missing
   details that block a safe draft.
5. Treat "launch a campaign" as a campaign draft or fulfillment request. Never
   silently publish ads or begin spend.
6. Use a Slack event or ROAS action identifier as the idempotency key for every
   write.
7. Do not invent the offer, objective, audience, launch timing, source assets,
   budget, owner, deadline, or other campaign details.
8. Save only sourced facts, decisions, and durable preferences as client
   memories. Include source title and source id.
9. Report the created Page Grader record and current workflow state after a
   successful action.
10. "Delegate to PageGrader" means call `list_mcp_tools` and then
   `use_mcp_tool` on the Page Grader MCP server. It does not mean
   `delegate_to_agent`.
11. A human named for Page Grader fulfillment is the fulfillment assignee.
   Resolve that person through Page Grader; do not replace the request with a
   generic ROAS task or ambient campaign-team lookup.
12. Never claim delegation or creation succeeded until the tool result
    confirms a durable effect.
13. For funnel work, discover the current MCP schema and use
    `page_grader_create_fulfillment_request` with the resolved `client_ref`,
    `task_type:"funnel"`, full `description`, stable `idempotency_key`, and
    `assignee_name` when supplied.
