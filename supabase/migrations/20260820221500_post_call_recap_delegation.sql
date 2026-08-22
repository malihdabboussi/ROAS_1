-- Post-call recap hit lists (IN PROGRESS / TO-DO) use the same one-confirm
-- Portal delegation preview as multi-task Slack asks.

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Post-call recap delegation

- A pasted post-call recap with IN PROGRESS / TO-DO items is the same class
  of ask as "I need this done". Skip ✅ DONE lines. Call
  `page_grader_create_delegation_preview` once with the resolved Portal
  client, Portal campaign_id, and the remaining-work raw_text.
- Reply with the returned `confirm_url` as a real openable https link.
  Do **not** loop `page_grader_create_fulfillment_request`. Do not say tasks
  were created until Confirm.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Post-call recap delegation%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Post-call recap delegation

- Post-call recap hit lists use `page_grader_create_delegation_preview` once.
  Skip ✅ DONE. Reply with the openable `confirm_url`. Do not loop
  `page_grader_create_fulfillment_request`.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Post-call recap delegation%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%## Post-call recap delegation%'
      AND markdown_content LIKE '%page_grader_create_delegation_preview%'
  ) < 2 THEN
    RAISE EXCEPTION 'Post-call recap delegation was not persisted for both agents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%## Post-call recap delegation%'
  ) THEN
    RAISE EXCEPTION 'Post-call recap delegation was not persisted in TOOLS.md';
  END IF;
END;
$$;
