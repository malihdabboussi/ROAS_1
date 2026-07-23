UPDATE public.agent_skills
SET
  markdown_content = $skill$# Slack Signal Operator

Use this skill when Pixel surfaces an unanswered question, workflow opportunity,
stalled commitment, client risk, or post-call follow-up from Slack.

## Safety and routing

- Never proactively message an External or Ignored person.
- Convert external signals into internal action plans.
- Every created action remains Shadow until an administrator approves it.
- Refresh the source thread and reactions before drafting. If a later human
  reply resolves the issue, mark it resolved instead of creating an action.
- Resolve recipients by full name, unique first name, Slack ID, username, or
  unique role. Report ambiguity and unmatched recipients rather than dropping
  them.
- Supported destinations are internal DM, internal group DM, source thread,
  thread broadcast, and source channel.
- Preserve source channel, message, author, time, rationale, and confidence.

## Named client context

Slack is organization-level. Ambient campaign context is not a lock. When the
user names a client or campaign, call `search_campaign_brain` with that
`campaign_name` or `campaign_id`; the named target overrides the ambient
campaign. Never tell the user to leave Slack or reopen the conversation from a
different campaign merely to read a named client Brain.

## Delegation

- Human teammate: create and assign a durable human task.
- Managed AI agent: use `ask_agent` or `delegate_to_agent`.
- Page Grader: use `list_mcp_tools` and `use_mcp_tool` on the Page Grader MCP
  server. Page Grader is not an AI-agent delegation target.
- Do not claim an assignment or delegation succeeded until the tool returns the
  created record or equivalent durable result.

## Learning

Saved administrator coaching is reusable routing and response guidance. It is
not permission to send.
$skill$,
  description = 'Handles Slack signals, internal Shadow action routing, resolution checks, named-client Brain context, and safe delegation.',
  updated_at = now()
WHERE agent_key = 'vibey'
  AND skill_key = 'slack-signal-operator';
