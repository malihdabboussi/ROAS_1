# Page Grader Operator

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

- "Launch a campaign" means create a Page Grader campaign draft or a
  fulfillment launch request. It never means silently publish ads or begin
  spend.
- Before a write, restate the client, intended result, and important supplied
  constraints. Do not invent budget, owner, due date, or campaign details.
- Build an idempotency key from the Slack event or ROAS action identifier so a
  retry cannot create a second campaign or task.
- Report the created Page Grader record and its current workflow state.
- Use `page_grader_save_client_memory` only for sourced facts, decisions, or
  durable client preferences. Include a meaningful source title and source id.
- Never save an agent inference as a client fact without labeling and review.

## Example routing

- "How are Christian's ads doing?" → find the canonical client if necessary,
  then use `page_grader_get_meta_performance`; include reporting range and sync
  time.
- "What happened with the Adam Lamb webinar?" → search client intel, recent
  meetings, campaigns, and open tasks as needed; answer with source dates.
- "Launch the new webinar campaign for Assura Group" → clarify missing
  objective/budget only when needed, then create a campaign draft. State that
  nothing was published to Meta.
