-- Upgrade Pixel's always-loaded routing policy for human-first delegation and
-- named-client resolution. Earlier Page Grader skill guidance did not replace
-- the stale delegation section in the global TOOLS.md definition.

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
- Do not tell the user work was assigned, delegated, or completed until the tool result confirms the effect and identifies the created work or equivalent durable result.$guidance$;
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

  delegation_start := strpos(
    tools_row.content,
    'For delegation and assignment:'
  );
  delegation_end := strpos(tools_row.content, E'\nFor unclear,');

  IF delegation_end = 0 THEN
    RAISE EXCEPTION 'Global Vibey TOOLS.md clarification anchor was not found';
  END IF;

  IF delegation_start > 0 THEN
    IF delegation_end <= delegation_start THEN
      RAISE EXCEPTION 'Global Vibey TOOLS.md delegation section is malformed';
    END IF;

    next_content :=
      left(tools_row.content, delegation_start - 1) ||
      delegation_guidance ||
      E'\n' ||
      substr(tools_row.content, delegation_end);
  ELSE
    next_content :=
      left(tools_row.content, delegation_end - 1) ||
      E'\n\n' ||
      delegation_guidance ||
      substr(tools_row.content, delegation_end);
  END IF;

  UPDATE public.agent_definitions
  SET
    content = next_content,
    updated_at = now()
  WHERE id = tools_row.id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE id = tools_row.id
      AND content LIKE '%A bare person name defaults to a human%'
      AND content LIKE '%assignee_type:"human"%'
      AND content LIKE '%A named client or campaign overrides ambient campaign context%'
      AND content LIKE '%campaign Brain, Page Grader, and relevant Slack channel%'
      AND content LIKE '%Do not pre-gate human assignment%'
  ) THEN
    RAISE EXCEPTION 'Pixel named-client delegation guidance was not persisted';
  END IF;
END;
$$;

UPDATE public.agent_skills
SET
  markdown_content = markdown_content || $rule$

## Named-client context precedence

Resolve a named client across its own ROAS campaign Brain, Page Grader
client/campaign records, and matching Slack channel context Pixel can access.
Do not treat absence from the ambient chat campaign as absence from ROAS, and
do not ask the user for context until these named-client sources are checked.
$rule$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Named-client context precedence%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%matching Slack channel context%'
  ) <> 2 THEN
    RAISE EXCEPTION 'Page Grader named-client source precedence was not persisted';
  END IF;
END;
$$;
