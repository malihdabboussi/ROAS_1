# Page Grader Operator

Use this skill when a Slack or ROAS user asks about a Page Grader client,
campaign, fulfillment task, client meeting, portal memory, cached Meta
reporting, or asks to build a funnel, landing page, campaign page, or related
fulfillment deliverable without naming Page Grader.

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

- Infer Page Grader from the requested deliverable. When the user says "I need
  this funnel built" or asks for a landing page or campaign page without naming
  a human or managed ROAS AI agent, use Page Grader MCP. Do not require the
  user to know or say "Page Grader".
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
- Before a write, resolve or confirm the client and campaign. For a new
  campaign or launch, retrieve available Brain, Space, and Page Grader context
  first, then ask only for missing details that block a safe draft. Do not
  invent the offer, objective, audience, launch timing, source assets, budget,
  owner, or due date.
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
  if another campaign is active, clarify missing
  objective/budget only when needed, then create a campaign draft. State that
  nothing was published to Meta.
- "Delegate this Asura Group funnel to PageGrader" → list Page Grader MCP
  tools, select the exact fulfillment/campaign write tool, call it with Asura
  Group's resolved identifier, and report only the confirmed result.
- "I need this funnel built for Asura Group" → infer Page Grader, resolve Asura
  Group and its campaign, retrieve known campaign details, ask only for
  genuinely blocking missing information, then create the confirmed Page
  Grader work item.
