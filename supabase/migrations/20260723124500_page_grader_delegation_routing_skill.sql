-- Persist Page Grader MCP routing so Agent API skill sync cannot discard it.

INSERT INTO public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
VALUES
(
  NULL,
  NULL,
  'vibey',
  'page-grader-operator',
  'Page Grader Operator',
  'Use for Page Grader clients, campaigns, fulfillment, meetings, memories, reporting, or explicit delegation to the Page Grader MCP service.',
  $skill$# Page Grader Operator

Use this skill when a Slack or ROAS user asks about a Page Grader client,
campaign, fulfillment task, client meeting, portal memory, or Page Grader's
cached Meta reporting.

## Source routing

- ROAS Brain is the primary reasoning and long-term knowledge system.
- Page Grader is the source of truth for Page Grader client records, portal
  campaigns, fulfillment tasks, client meeting copies, and its connected Meta
  reporting snapshots.
- Use the `Page Grader` MCP server when the answer depends on Page Grader-only
  data. Do not guess from a similarly named ROAS Space.
- An explicitly named Page Grader client overrides the current ROAS campaign
  context. Resolve that client first and pass its exact identifier to later
  tools.
- For an ambiguous or misspelled client, call
  `page_grader_list_clients` before another client-scoped tool.
- Cross-reference Page Grader facts with ROAS Brain when interpretation,
  strategy, brand voice, or historical reasoning is needed. State when the two
  sources disagree.

## Reading

- Use `page_grader_get_client_overview` for broad status questions.
- Use the narrow campaign, task, meeting, Meta, or intel tool for a specific
  question.
- Keep the source date in the answer. Meta results are cached snapshots, not
  live Meta API reads.
- If no snapshot exists or it is stale, say that plainly and offer the latest
  known reporting range.

## Taking action

- When the user says "delegate to PageGrader", treat Page Grader as the
  connected MCP service, not as a ROAS AI agent. Call `list_mcp_tools` for the
  `Page Grader` server, copy the exact write-tool schema, then call
  `use_mcp_tool`.
- Do not call `delegate_to_agent` for Page Grader work. If the user instead
  names a human teammate, create a durable task assigned to that human. If the
  user names a managed ROAS AI agent, use `ask_agent` or `delegate_to_agent`.
- "Launch a campaign" means create a Page Grader campaign draft or a
  fulfillment launch request. It never means silently publish ads or begin
  spend.
- Before a write, restate the client, intended result, and important supplied
  constraints. Do not invent budget, owner, due date, or campaign details.
- Build an idempotency key from the Slack event or ROAS action identifier so a
  retry cannot create a second campaign or task.
- Report the created Page Grader record and its current workflow state.
- Do not say a request was delegated or created until the MCP result confirms
  the effect and returns the created record or an equivalent durable result.
  If Page Grader is unavailable, report the blocker instead of describing the
  requested work as completed.
- Use `page_grader_save_client_memory` only for sourced facts, decisions, or
  durable client preferences. Include a meaningful source title and source id.
- Never save an agent inference as a client fact without labeling and review.

## Example routing

- "How are Christian's ads doing?" → find the canonical client if necessary,
  then use `page_grader_get_meta_performance`; include reporting range and sync
  time.
- "What happened with the Adam Lamb webinar?" → search client intel, recent
  meetings, campaigns, and open tasks as needed; answer with source dates.
- "Launch the new webinar campaign for Asura Group" → resolve Asura Group even
  if another campaign is active, clarify missing objective/budget only when
  needed, then create a campaign draft. State that nothing was published to
  Meta.
- "Delegate this Asura Group funnel to PageGrader" → list Page Grader MCP
  tools, select the exact fulfillment/campaign write tool, call it with Asura
  Group's resolved identifier, and report only the confirmed result.
$skill$,
  true,
  'system'
),
(
  NULL,
  NULL,
  'atlas',
  'page-grader-operator',
  'Page Grader Operator',
  'Use for Page Grader clients, campaigns, fulfillment, meetings, memories, reporting, or explicit delegation to the Page Grader MCP service.',
  $atlas$# Page Grader Operator

Use the `Page Grader` MCP server whenever a request depends on Page Grader-only
client, campaign, fulfillment, meeting, memory, or cached Meta information.

ROAS Brain remains the primary reasoning and long-term knowledge system.
Page Grader remains authoritative for its portal records. Cross-reference both
when strategy or brand interpretation is required, and call out disagreements.

## Rules

1. Resolve ambiguous names with `page_grader_list_clients`. An explicitly
   named client overrides ambient campaign context.
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
8. "Delegate to PageGrader" means call `list_mcp_tools` and then
   `use_mcp_tool` on the Page Grader MCP server. It does not mean
   `delegate_to_agent`.
9. Human targets receive assigned tasks; managed AI agents receive
   `ask_agent` or `delegate_to_agent`.
10. Never claim delegation or creation succeeded until the tool result
    confirms a durable effect.
$atlas$,
  true,
  'system'
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled,
  source = EXCLUDED.source,
  updated_at = now();
