-- Keep Page Grader as the fulfillment system when a funnel request names a human owner.

UPDATE public.agent_skills
SET
  description =
    'Use for Page Grader clients, campaigns, fulfillment, meetings, memories, reporting, explicit Page Grader delegation, or funnel and landing-page fulfillment requests, including requests with a named human owner.',
  markdown_content = replace(
    replace(
      replace(
        replace(
          markdown_content,
          'fulfillment deliverable without naming Page Grader.',
          'fulfillment deliverable, including when the user names the human who should
own that work.'
        ),
        'this funnel built" or asks for a landing page or campaign page without naming
  a human or managed ROAS AI agent, use Page Grader MCP. Do not require the
  user to know or say "Page Grader".',
        'this funnel built" or asks for a landing page or campaign page, use Page
  Grader MCP even when the user names the human owner. Do not require the user
  to know or say "Page Grader".'
      ),
      '- Do not call `delegate_to_agent` for Page Grader work. If the user instead
  names a human teammate, create a durable task assigned to that human. If the
  user names a managed ROAS AI agent, use `ask_agent` or `delegate_to_agent`.',
      '- Do not call `delegate_to_agent` for Page Grader work. A human named in a
  funnel or page request is the Page Grader fulfillment assignee, not a reason
  to switch to a generic ROAS task. Resolve the person with Page Grader and
  pass the canonical name in `assignee_name`.
- Do not use `list_team`, `list_campaign_team`, `list_agents`,
  `brainstorm_agents`, `ask_agent`, or `delegate_to_agent` to resolve the human
  owner of Page Grader fulfillment. An empty ambient campaign team does not
  mean the person is unavailable in Page Grader.'
    ),
    '- Build an idempotency key from the Slack event or ROAS action identifier so a
  retry cannot create a second campaign or task.',
    '- Build an idempotency key from the Slack event or ROAS action identifier so a
  retry cannot create a second campaign or task.
- For a funnel fulfillment request, discover the current MCP schema and use
  `page_grader_create_fulfillment_request` with the resolved `client_ref`,
  `task_type:"funnel"`, the complete request in `description`, a stable
  `idempotency_key`, and `assignee_name` when the user named an owner.'
  )
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key = 'page-grader-operator';

UPDATE public.agent_skills
SET markdown_content = markdown_content ||
  $rule$

- "Have Rafay build a funnel similar to this Impact funnel for Asura Group" →
  resolve Asura Group through Page Grader, keep the reference URL and known
  client context in the description, create a Page Grader funnel fulfillment
  request with `assignee_name:"Rafay"`, and report the confirmed record. Do not
  search the ambient ROAS campaign team for Rafay.
$rule$
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%assignee_name:"Rafay"%';

UPDATE public.agent_skills
SET
  description =
    'Use for Page Grader clients, campaigns, fulfillment, meetings, memories, reporting, explicit Page Grader delegation, or funnel and landing-page fulfillment requests, including requests with a named human owner.',
  markdown_content = replace(
    replace(
      replace(
        markdown_content,
        'deliverable without naming a human or managed ROAS AI agent.',
        'deliverable, including when the user names the human who should own that work.'
      ),
      'campaign page, or related fulfillment deliverable without naming a human or
   managed ROAS AI agent. Do not require the user to say "Page Grader".',
      'campaign page, or related fulfillment deliverable, even when a human owner
   is named. Pass that person as the Page Grader assignee. Do not require the
   user to say "Page Grader".'
    ),
    '11. Human targets receive assigned tasks; managed AI agents receive
   `ask_agent` or `delegate_to_agent`.
12. Never claim delegation or creation succeeded until the tool result
    confirms a durable effect.',
    '11. A human named for Page Grader fulfillment is the fulfillment assignee.
   Resolve that person through Page Grader; do not replace the request with a
   generic ROAS task or ambient campaign-team lookup.
12. Never claim delegation or creation succeeded until the tool result
    confirms a durable effect.
13. For funnel work, discover the current MCP schema and use
    `page_grader_create_fulfillment_request` with the resolved `client_ref`,
    `task_type:"funnel"`, full `description`, stable `idempotency_key`, and
    `assignee_name` when supplied.'
  )
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = 'atlas'
  AND skill_key = 'page-grader-operator';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%assignee_name:"Rafay"%'
      AND markdown_content LIKE '%page_grader_create_fulfillment_request%'
  ) THEN
    RAISE EXCEPTION 'Vibey Page Grader human fulfillment routing was not persisted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'atlas'
      AND skill_key = 'page-grader-operator'
      AND markdown_content LIKE '%page_grader_create_fulfillment_request%'
  ) THEN
    RAISE EXCEPTION 'Atlas Page Grader human fulfillment routing was not persisted';
  END IF;
END;
$$;
