-- Brain memory routing: teach Manager (mission-planner) the 3 layers; mirror skill onto manager agent; extend Atlas knowledge-intake.

INSERT INTO public.agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled, archetype_filter)
SELECT NULL,
       'manager',
       skill_key,
       name,
       description,
       markdown_content,
       is_enabled,
       archetype_filter
FROM public.agent_skills
WHERE user_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key = 'mission-planner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skills s2
    WHERE s2.user_id IS NULL
      AND s2.agent_key = 'manager'
      AND s2.skill_key = 'mission-planner'
  );

UPDATE public.agent_skills
SET markdown_content =
      markdown_content
      || E'\n\n## Step 6: Brain memory routing (mandatory for ingest / move / archive missions)\n\n'
      || E'Vibey has durable brain layers plus active campaign/Space context. They are not interchangeable:\n\n'
      || E'1. **USER brain** (main brain, default brain, "my brain") — owner-wide durable memory. Workers use **user/default scope** tools (e.g. `save_user_memory`).\n'
      || E'2. **AGENT brain** — per-worker knowledge for **one** role. Use **agent brain** ingest tools with a resolved `brain_id`.\n'
      || E'3. **Campaign/Space context** — active project context, not a Brain write target.\n\n'
      || E'**Authority rule:** Mission **title + brief** override habits. If the user says "main brain" / "my brain" / "user brain", the plan **summary**, **approach**, and **every subtask title + intent endState** must reflect **USER** ingestion.\n\n'
      || E'**Bias guard:** Do **not** invent a campaign brain target just because `campaign_id` is set.\n\n'
      || E'If the target layer is ambiguous, return `{ "kind": "blocked", "feedback": "..." }` and ask which layer they want.\n',
    description =
      COALESCE(description, '')
      || E' Enforces correct USER vs AGENT brain routing in plans; never invent a brain target from campaign_id alone.'
WHERE user_id IS NULL
  AND agent_key IN ('vibey', 'manager')
  AND skill_key = 'mission-planner'
  AND markdown_content NOT LIKE '%Step 6: Brain memory routing (mandatory%';

UPDATE public.agent_skills
SET markdown_content =
      markdown_content
      || E'\n\n## Three memory layers (do not confuse them)\n\n'
      || E'- **User / default / main brain:** cross-campaign owner cognition — `save_user_memory` and related tools on the **user** scope.\n'
      || E'- **Agent brain:** one worker''s expertise corpus — `ingest_agent_brain_*` after `resolve_agent_brain` / `list_available_brain_scopes`.\n'
      || E'- **Campaign/Space context:** project context, not a Brain write target.\n\n'
      || E'The **Manager mission plan** may mis-label the target because missions carry `campaign_id`. **Mission brief wins.** If the plan contradicts the brief, Atlas returns `brain_routing_conflict` JSON — do not fight it; replan.\n',
    description =
      COALESCE(description, '') || E' Aligns intake with user vs agent brain; acknowledges planner bias.'
WHERE user_id IS NULL
  AND agent_key = 'atlas'
  AND skill_key = 'knowledge-intake'
  AND markdown_content NOT LIKE '%Three memory layers (do not confuse them)%';
