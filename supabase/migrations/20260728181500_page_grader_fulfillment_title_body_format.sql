-- Teach Page Grader operators to put a short title on line 1 of description
-- so The ROAS Portal can store title vs body separately.

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  $old$
- For a funnel fulfillment request, discover the current MCP schema and use
  `page_grader_create_fulfillment_request` with the resolved `client_ref`,
  `task_type:"funnel"`, the complete request in `description`, a stable
  `idempotency_key`, and `assignee_name` when the user named an owner.
$old$,
  $new$
- For a funnel fulfillment request, discover the current MCP schema and use
  `page_grader_create_fulfillment_request` with the resolved `client_ref`,
  `task_type:"funnel"`, a stable `idempotency_key`, and `assignee_name` when
  the user named an owner. Format `description` as:
  - Line 1: a short title only (≤ ~100 characters; no scope dump).
  - Blank line.
  - Remaining lines: full brief, links, scope, and constraints.
  The portal uses the first line as the task title and the rest as the body.
  Never put the entire brief on one line.
$new$
)
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key = 'page-grader-operator'
  AND markdown_content LIKE '%the complete request in `description`%';

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  $old$
13. For funnel work, discover the current MCP schema and use
    `page_grader_create_fulfillment_request` with the resolved `client_ref`,
    `task_type:"funnel"`, full `description`, stable `idempotency_key`, and
    `assignee_name` when supplied.
$old$,
  $new$
13. For funnel work, discover the current MCP schema and use
    `page_grader_create_fulfillment_request` with the resolved `client_ref`,
    `task_type:"funnel"`, stable `idempotency_key`, and `assignee_name` when
    supplied. Format `description` as:
    - Line 1: a short title only (≤ ~100 characters; no scope dump).
    - Blank line.
    - Remaining lines: full brief, links, scope, and constraints.
    The portal uses the first line as the task title and the rest as the body.
    Never put the entire brief on one line.
$new$
)
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'atlas'
  AND skill_key = 'page-grader-operator'
  AND markdown_content LIKE '%full `description`%';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%Never put the entire brief on one line%'
  ) THEN
    RAISE EXCEPTION 'Vibey Page Grader title/body format guidance was not persisted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'atlas'
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%Never put the entire brief on one line%'
  ) THEN
    RAISE EXCEPTION 'Atlas Page Grader title/body format guidance was not persisted';
  END IF;
END $$;
