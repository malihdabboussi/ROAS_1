-- Slack @mention of a teammate on client fulfillment stays on Service Request
-- intake. Pixel must post review_url and must not substitute slash-alias names.

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Slack mention Service Request routing

- A Slack @mention of a teammate on client fulfillment is still a Service
  Request. Keep `page_grader_create_fulfillment_request` and post the
  `review_url` as a real openable https link.
- Use the Slack display name and email from any `[Slack teammates mentioned]`
  block for `assignee_name`.
- Do not call native `create_task` because someone was tagged.
- Do not replace the tagged person with a different slash-alias roster row
  (`Harry M.` is not `Harry/Haroon` unless email or id matches).
- When they refer to making or creating a task, assume Service Request intake.
  If they describe client work but have not asked for a task, ask exactly:
  "Did you want me to create a task for this?" Do not invent a task until
  they confirm.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Slack mention Service Request routing%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Slack mention Service Request routing

- Slack @mention of a teammate on client fulfillment still uses
  `page_grader_create_fulfillment_request`. Reply with the openable
  `review_url`. Use `[Slack teammates mentioned]` display name and email.
  Do not call `create_task`. Do not substitute a slash alias
  (`Harry M.` is not `Harry/Haroon` unless email or id matches).
  When they refer to making or creating a task, assume Service Request
  intake. If unsure, ask exactly: "Did you want me to create a task for this?"
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Slack mention Service Request routing%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%## Slack mention Service Request routing%'
      AND markdown_content LIKE '%[Slack teammates mentioned]%'
  ) < 2 THEN
    RAISE EXCEPTION 'Slack mention Service Request routing was not persisted for both agents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%Slack mention Service Request routing%'
      AND content LIKE '%[Slack teammates mentioned]%'
  ) THEN
    RAISE EXCEPTION 'Slack mention Service Request routing was not persisted in TOOLS.md';
  END IF;
END;
$$;
