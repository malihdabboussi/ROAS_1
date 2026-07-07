-- Live HR installations use skill-creator for update_agent_skill instructions.
-- Add a human-readable checkpoint label requirement there as well.

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  '### Update

```',
  '### Update

Every `update_agent_skill` call must include `change_summary`: a past-tense, human-readable label of what changed in the agent behavior or skill. Keep it under 120 characters and never mention files, markdown, JSON, or schemas.

Good: "Sharpened their copy-review process"
Bad: "Updated markdown_content"

```'
)
WHERE agent_key = 'hr'
  AND skill_key = 'skill-creator'
  AND markdown_content LIKE '%action: "update_agent_skill"%'
  AND markdown_content NOT LIKE '%Every `update_agent_skill` call must include `change_summary`%';

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  'data: { "agent_key": "KEY", "skill_id": "UUID", "description": "...", "markdown_content": "..." }',
  'data: { "agent_key": "KEY", "skill_id": "UUID", "description": "...", "markdown_content": "...", "change_summary": "Sharpened their copy-review process" }'
)
WHERE agent_key = 'hr'
  AND skill_key = 'skill-creator'
  AND markdown_content LIKE '%action: "update_agent_skill"%'
  AND markdown_content NOT LIKE '%Sharpened their copy-review process%';
