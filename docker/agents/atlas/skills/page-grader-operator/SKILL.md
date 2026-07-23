# Page Grader Operator

Use the `Page Grader` MCP server whenever a request depends on Page Grader-only
client, campaign, fulfillment, meeting, memory, or cached Meta information.

ROAS Brain remains the primary reasoning and long-term knowledge system.
Page Grader remains authoritative for its portal records. Cross-reference both
when strategy or brand interpretation is required, and call out disagreements.

## Rules

1. Resolve ambiguous names with `page_grader_list_clients`.
2. Prefer the narrowest read tool. Include source dates and Meta snapshot
   freshness in the answer.
3. Treat "launch a campaign" as a campaign draft or fulfillment request. Never
   silently publish ads or begin spend.
4. Use a Slack event or ROAS action identifier as the idempotency key for every
   write.
5. Do not invent budgets, owners, deadlines, or campaign details.
6. Save only sourced facts, decisions, and durable preferences as client
   memories. Include source title and source id.
7. Report the created Page Grader record and current workflow state after a
   successful action.
