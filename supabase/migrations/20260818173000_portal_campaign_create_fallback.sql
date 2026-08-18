-- Portal campaign create must persist even when the live Page Grader catalog
-- has no campaign-draft write. Missing VSL/landing-page assets become tasks.

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Portal campaign create

- Call `list_mcp_tools` and use the exact live campaign-draft write if one
  exists. Do not invent a tool name such as `page_grader_create_campaign_draft`.
- Missing VSL, landing page, or creative assets are not create-blockers.
  Create the campaign, then add those as campaign tasks.
- If no live campaign-draft write exists, use native `create_campaign`, post
  the returned `url`, and `create_task` for the missing launch work. Do not
  stop after a vague create rejection.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Portal campaign create%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Portal campaign create

- List live Page Grader tools first. Use the exact campaign-draft write if it
  exists. Do not invent a tool name.
- Missing VSL, landing page, or creative assets are not create-blockers.
- If that write is unavailable, use native `create_campaign`, include the
  returned `url`, and `create_task` for missing launch work.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Portal campaign create%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%## Portal campaign create%'
      AND markdown_content LIKE '%Missing VSL, landing page, or creative assets%'
  ) < 2 THEN
    RAISE EXCEPTION 'Portal campaign create fallback was not persisted for both agents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%## Portal campaign create%'
  ) THEN
    RAISE EXCEPTION 'Portal campaign create fallback was not persisted in TOOLS.md';
  END IF;
END;
$$;
