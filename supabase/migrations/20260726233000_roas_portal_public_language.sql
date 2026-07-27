-- Keep Page Grader as an internal integration name while Pixel and other
-- user-facing agents consistently call it "The ROAS Portal".

UPDATE public.agent_definitions
SET
  content = replace(
    replace(
      replace(
        replace(
          content,
          'In user-facing replies, call Page Grader the "ROAS portal"',
          'In user-facing replies, call Page Grader "The ROAS Portal"'
        ),
        'means the ROAS portal fulfillment workflow',
        'means The ROAS Portal fulfillment workflow'
      ),
      'If ROAS portal fulfillment fails',
      'If The ROAS Portal fulfillment fails'
    ),
    'Never expose MCP, tool names, schemas, idempotency keys, routing, retries, or provider mechanics.',
    'Never expose the internal name "Page Grader", MCP, tool names, schemas, idempotency keys, routing, retries, or provider mechanics.'
  ),
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md';

UPDATE public.agent_skills
SET
  markdown_content = replace(
    replace(
      replace(
        replace(
          markdown_content,
          'In user-facing replies, call Page Grader the "ROAS portal"',
          'In user-facing replies, call Page Grader "The ROAS Portal"'
        ),
        'means the ROAS portal fulfillment workflow',
        'means The ROAS Portal fulfillment workflow'
      ),
      'If ROAS portal fulfillment fails',
      'If The ROAS Portal fulfillment fails'
    ),
    '- Do not narrate tool selection or execution between tool calls.',
    '- Never expose the internal name "Page Grader" in a user-facing response or Slack message.' ||
      E'\n- Do not narrate tool selection or execution between tool calls.'
  ),
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%call Page Grader "The ROAS Portal"%'
      AND content LIKE '%Never expose the internal name "Page Grader"%'
      AND content LIKE '%Do not narrate tool selection or execution between tool calls%'
  ) THEN
    RAISE EXCEPTION 'The ROAS Portal user-facing policy was not persisted';
  END IF;

  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%call Page Grader "The ROAS Portal"%'
      AND markdown_content LIKE '%Never expose the internal name "Page Grader"%'
  ) <> 2 THEN
    RAISE EXCEPTION 'The ROAS Portal skill vocabulary was not persisted';
  END IF;
END;
$$;
