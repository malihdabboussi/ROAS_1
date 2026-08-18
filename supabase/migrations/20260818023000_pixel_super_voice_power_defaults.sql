-- Pixel message writing defaults: Dylan Super Voice skill + Power model,
-- plus TOOLS guidance so "write this message" loads the voice skill first.

BEGIN;

-- Future Pixel repairs / promotions default to Power.
-- Existing vibey registry rows also move to Power for message-quality turns.

UPDATE public.agents_registry
SET
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{model_id}',
    '"auto:power"'::jsonb,
    true
  ),
  updated_at = now()
WHERE agent_key = 'vibey'
  AND COALESCE(config ->> 'model_id', '') IS DISTINCT FROM 'auto:power';

-- Assign the canonical voice skill to every Pixel / vibey agent row.
INSERT INTO public.agent_skills AS existing (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
SELECT
  registry.user_id,
  registry.org_id,
  registry.agent_key,
  voice.skill_key,
  voice.name,
  voice.description,
  voice.markdown_content,
  true,
  CASE
    WHEN registry.user_id IS NULL AND registry.org_id IS NULL THEN 'system'
    ELSE 'default'
  END
FROM public.agents_registry AS registry
CROSS JOIN public.skill_library AS voice
WHERE registry.agent_key = 'vibey'
  AND voice.skill_key = 'dylans-super-voice'
ON CONFLICT DO NOTHING;

UPDATE public.agent_skills
SET is_enabled = true, updated_at = now()
WHERE agent_key = 'vibey'
  AND skill_key = 'dylans-super-voice'
  AND is_enabled IS DISTINCT FROM true;

-- Patch vibey TOOLS.md (canonical + any scoped copies) with send-ready voice default.
DO $$
DECLARE
  tools_row record;
  heading constant text := 'For send-ready messages, emails, Slack/DM drafts, or "write this message":';
  guidance constant text := $guidance$For send-ready messages, emails, Slack/DM drafts, or "write this message":
- Default to Dylan Super Voice. Load `skills/dylans-super-voice/SKILL.md` first and use it as the only voice authority for any message, email, Slack/DM, client recap, or outreach draft. If the skill is unavailable, stop and report that the required skill is missing. Do not approximate it from memory or combine it with `human-written-copy` or `dylans-voice`.
- Put each variant in a fenced ```draft <label>``` block (consecutive fences become one editable version card). Two variants is the sweet spot (full + short). Keep commentary outside the fences.
- Drafts must be usable as-is: real names, real dates, real work. A `draft` card with `[brackets]` is invalid until retrieval came back empty.
$guidance$;
  heading_start integer;
  after_heading integer;
  rest text;
  next_for integer;
  next_heading integer;
  unclear integer;
  replace_end integer;
  call_start integer;
  first_person_start integer;
  insert_at integer;
  next_content text;
BEGIN
  FOR tools_row IN
    SELECT id, content
    FROM public.agent_definitions
    WHERE agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
  LOOP
    IF tools_row.content LIKE '%' || heading || '%' AND tools_row.content LIKE '%Default to Dylan Super Voice%' THEN
      CONTINUE;
    END IF;

    heading_start := strpos(tools_row.content, heading);
    IF heading_start > 0 THEN
      after_heading := heading_start + length(heading);
      rest := substr(tools_row.content, after_heading);
      next_for := strpos(rest, E'\nFor ');
      next_heading := strpos(rest, E'\n### ');
      unclear := strpos(rest, E'\nFor unclear,');
      replace_end := 0;
      IF next_for > 0 THEN
        replace_end := after_heading + next_for - 1;
      END IF;
      IF next_heading > 0 AND (replace_end = 0 OR after_heading + next_heading - 1 < replace_end) THEN
        replace_end := after_heading + next_heading - 1;
      END IF;
      IF unclear > 0 AND (replace_end = 0 OR after_heading + unclear - 1 < replace_end) THEN
        replace_end := after_heading + unclear - 1;
      END IF;
      IF replace_end = 0 THEN
        replace_end := length(tools_row.content) + 1;
      END IF;
      next_content :=
        left(tools_row.content, heading_start - 1) ||
        guidance ||
        substr(tools_row.content, replace_end);
    ELSE
      call_start := strpos(tools_row.content, E'\nFor call, meeting, recording, or transcript retrieval');
      first_person_start := strpos(tools_row.content, E'\nFor first-person fill, guest prep, or write-as-me:');
      unclear := strpos(tools_row.content, E'\nFor unclear,');
      IF call_start > 0 THEN
        insert_at := call_start;
      ELSIF first_person_start > 0 THEN
        insert_at := first_person_start;
      ELSIF unclear > 0 THEN
        insert_at := unclear;
      ELSE
        insert_at := length(tools_row.content) + 1;
      END IF;
      next_content :=
        left(tools_row.content, insert_at - 1) ||
        E'\n\n' || guidance ||
        substr(tools_row.content, insert_at);
    END IF;

    UPDATE public.agent_definitions
    SET content = next_content, updated_at = now()
    WHERE id = tools_row.id;
  END LOOP;
END
$$;

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agents_registry
    WHERE agent_key = 'vibey'
      AND config ->> 'model_id' = 'auto:power'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Pixel Power model default was not applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_skills
    WHERE agent_key = 'vibey'
      AND skill_key = 'dylans-super-voice'
      AND is_enabled = true
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Pixel Dylan Super Voice skill assignment was not applied';
  END IF;
END
$verify$;

COMMIT;
