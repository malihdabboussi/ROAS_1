-- Multi-task Slack fulfillment uses one Portal Pixel confirm link instead of
-- looping page_grader_create_fulfillment_request.

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Campaign batch delegation preview

- When the user asks to get several fulfillment jobs done in one message
  (QC a funnel + check GHL + reset ads, "I need this done", a paste of 2+
  discrete tasks) for a named or channel-stamped client, call
  `page_grader_create_delegation_preview` once with the resolved Portal
  client, Portal campaign_id, and the full raw_text.
- Reply with the returned `confirm_url` as a real openable https link.
  The operator reviews and Confirms in The ROAS Portal.
- Do **not** loop `page_grader_create_fulfillment_request` for this class of
  ask. Do not say tasks were created until Confirm.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Campaign batch delegation preview%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Campaign batch delegation preview

- Several fulfillment jobs in one Slack message use
  `page_grader_create_delegation_preview` once. Reply with the openable
  `confirm_url`. Do not loop `page_grader_create_fulfillment_request`.
  Do not say tasks were created until the operator Confirms in The ROAS Portal.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Campaign batch delegation preview%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%## Campaign batch delegation preview%'
      AND markdown_content LIKE '%page_grader_create_delegation_preview%'
  ) < 2 THEN
    RAISE EXCEPTION 'Campaign batch delegation preview was not persisted for both agents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%page_grader_create_delegation_preview%'
  ) THEN
    RAISE EXCEPTION 'Campaign batch delegation preview was not persisted in TOOLS.md';
  END IF;
END;
$$;
