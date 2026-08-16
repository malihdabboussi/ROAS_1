-- Make the post-migration authority boundary explicit for both persisted agents.
UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Canonical Service Request authority

- ROAS Platform owns the Service Request draft, public review link, final native
  task identity, requester/provenance, and workflow state.
- Page Grader is an intake and ClickUp mirror adapter. It is not a competing
  request/task authority.
- `page_grader_create_fulfillment_request` returns a reviewable ROAS draft. A
  durable draft receipt is not proof that a task or ClickUp item exists.
- Only say the task is created after finalization returns the native ROAS task
  ID. Only say ClickUp is synced when the receipt includes its task ID and URL.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Canonical Service Request authority%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%ROAS Platform owns the Service Request draft%'
  ) < 2 THEN
    RAISE EXCEPTION 'Canonical Service Request authority was not persisted for both agents';
  END IF;
END;
$$;
