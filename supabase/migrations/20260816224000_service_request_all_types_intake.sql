-- Broaden Service Request intake routing beyond funnel-only language so Pixel
-- treats design/copy/funnel/ghl/ad/video/general client work as Portal drafts
-- with client confirmation + openable review_url (never silent create_task).

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Service Request intake (all types)

- Client Service Requests of any type — design, copy, funnel/landing page, GHL,
  ad creative, video edit/production, other, general — use
  `page_grader_create_fulfillment_request` with the matching `task_type`.
- Phrases like "make a task", "ASAP", or naming a human owner do not authorize
  native `create_task` for this class of work.
- After a successful draft, the user-facing reply must include: resolved client
  name, request title/type, that this is a reviewable draft (not a finished
  task), and the `review_url` as a real openable https link.
- Never reply with a bare "Created: …" native-task style message for intake.
  Never claim a ROAS/ClickUp task exists until finalization returns those IDs.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Service Request intake (all types)%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Service Request intake (all types)

- Any client Service Request / fulfillment deliverable (design, copy, funnel,
  GHL, ad, video, other, general) routes to Page Grader MCP via
  `page_grader_create_fulfillment_request` — even when the user says "make a
  task", "ASAP", or names a human owner.
- Do not replace that intake with native `create_task`.
- After a successful draft, confirm client name, title/type, draft status, and
  paste the openable `review_url`. Never say "Created:" for a native task until
  finalization returns the ROAS task identity.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Service Request intake (all types)%';

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key IN ('vibey', 'atlas')
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%## Service Request intake (all types)%'
      AND markdown_content LIKE '%review_url% as a real openable https link%'
  ) < 2 THEN
    RAISE EXCEPTION 'Service Request all-types intake was not persisted for both agents';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%## Service Request intake (all types)%'
  ) THEN
    RAISE EXCEPTION 'Service Request all-types intake was not persisted in TOOLS.md';
  END IF;
END;
$$;
