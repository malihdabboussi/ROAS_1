-- Keep tool execution private and standardize the product names Pixel uses
-- in user-facing replies.

DO $$
DECLARE
  tools_row record;
  delegation_start integer;
  delegation_end integer;
  next_content text;
  delegation_guidance constant text := $guidance$For delegation and assignment:
- Resolve the explicitly named target before choosing a tool. A bare person name defaults to a human, not a managed AI agent.
- Human teammate → for ordinary human-owned work, call `create_task` with `assignee_type:"human"` and `assignee_name`. The action resolves active organization members by name. Do not pre-gate human assignment with `list_team`, `list_campaign_team`, or `list_agents`.
- Managed AI agent → use `ask_agent` or `delegate_to_agent` only when the user explicitly names a managed AI agent, explicitly asks for an agent, or you intentionally choose an AI agent for otherwise unassigned work.
- If human assignment returns an ambiguous or missing-member result, ask one focused clarification using the returned candidates or request a full name/email. Do not claim the person does not exist, substitute another human or agent, or claim success.
- A named client or campaign overrides ambient campaign context. Resolve that named client across its campaign Brain, Page Grader, and relevant Slack channel or Space evidence before asking the user for context. Do not limit the search to the campaign attached to the current chat.
- Connected MCP service such as Page Grader → call `list_mcp_tools`, then `use_mcp_tool` with the exact returned schema. Do not route an MCP service through `delegate_to_agent`.
- A funnel, landing page, campaign page, or related fulfillment deliverable routes to the Page Grader MCP even when the user names the human owner. Put that person in the Page Grader request's assignee field; do not replace Page Grader fulfillment with `create_task`, `list_team`, `list_campaign_team`, `ask_agent`, or `delegate_to_agent`. Do not require the user to know or say "Page Grader".
- A named human owner of Page Grader fulfillment is not evidence that the person is a managed ROAS AI agent or a member of the ambient campaign team. Resolve the client and assignee through Page Grader.
- For this Page Grader work, resolve or confirm the client and campaign before creating Page Grader work. For a new campaign or launch, use available campaign Brain, Space, Page Grader, and Slack context first, then ask only for missing details that block a safe draft; never invent the offer, objective, audience, launch timing, or source assets.
- Do not tell the user work was assigned, delegated, or completed until the tool result confirms the effect and identifies the created work or equivalent durable result.
- Treat Page Grader, MCP, tool names, schemas, idempotency keys, routing, retries, and provider mechanics as internal implementation details. In user-facing replies, call Page Grader the "ROAS portal" and call the AI platform the "ROAS platform". Never expose MCP, tool names, schemas, idempotency keys, routing, retries, or provider mechanics.
- Do not narrate tool selection or execution between tool calls. Put short progress only in structured tool labels. In chat, return one concise result after the work finishes: what happened, who owns it, the relevant client or campaign, and the next step. If blocked, state one plain-language blocker or ask one focused question.$guidance$;
BEGIN
  SELECT id, content
  INTO tools_row
  FROM public.agent_definitions
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'vibey'
    AND file_name = 'TOOLS.md'
  LIMIT 1;

  IF tools_row.id IS NULL THEN
    RAISE EXCEPTION 'Global Vibey TOOLS.md definition was not found';
  END IF;

  delegation_start := strpos(tools_row.content, 'For delegation and assignment:');
  delegation_end := strpos(tools_row.content, E'\nFor unclear,');

  IF delegation_start = 0 OR delegation_end <= delegation_start THEN
    RAISE EXCEPTION 'Global Vibey TOOLS.md delegation section is malformed';
  END IF;

  next_content :=
    left(tools_row.content, delegation_start - 1) ||
    delegation_guidance ||
    E'\n' ||
    substr(tools_row.content, delegation_end);

  UPDATE public.agent_definitions
  SET
    content = next_content,
    updated_at = now()
  WHERE id = tools_row.id;
END;
$$;

UPDATE public.agent_skills
SET
  markdown_content = markdown_content || $rule$

## User-facing response

- Treat Page Grader, MCP, tool names, schemas, idempotency keys, routing,
  retries, and provider mechanics as internal implementation details.
- In user-facing replies, call Page Grader the "ROAS portal" and call the AI
  platform the "ROAS platform".
- Do not narrate tool selection or execution between tool calls. Put progress
  only in structured tool labels.
- After the work finishes, return one concise result: what happened, who owns
  it, the relevant client or campaign, and the next step.
- If blocked, state one plain-language blocker or ask one focused question.
$rule$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## User-facing response%';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%call Page Grader the "ROAS portal"%'
      AND content LIKE '%Do not narrate tool selection or execution between tool calls%'
  ) THEN
    RAISE EXCEPTION 'Pixel user-facing response policy was not persisted';
  END IF;

  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%call Page Grader the "ROAS portal"%'
  ) <> 2 THEN
    RAISE EXCEPTION 'ROAS portal user-facing vocabulary was not persisted';
  END IF;
END;
$$;
