-- Teach HR to provide human-readable checkpoint labels for agent edits.

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  '## What NOT to Do',
  '## Required: change_summary

Every `update_agent` and `update_agent_skill` call must include `change_summary`.

Rules:
- Write it in past tense.
- Describe what changed in the agent''s behavior, tone, process, or skill.
- Keep it under 120 characters.
- Do not mention SOUL.md, ROLE.md, IDENTITY.md, markdown, files, JSON, or schemas.

Good examples:
- "Made Sarah more direct and concise"
- "Sharpened her copy-review process"
- "Added LinkedIn outreach skill"
- "Switched her tone from formal to casual"

Bad examples:
- "Updated SOUL.md"
- "Edited ROLE.md and IDENTITY.md"
- "Changed markdown_content"

## What NOT to Do'
)
WHERE agent_key = 'hr'
  AND skill_key = 'update-agent'
  AND markdown_content NOT LIKE '%Required: change_summary%';

UPDATE public.agent_skills
SET markdown_content = replace(
  markdown_content,
  'data: {
    agent_key: "copywriter",
    soul: "...new SOUL.md content...",
    role_content: "...new ROLE.md content...",
    identity: "...new IDENTITY.md content..."
  }',
  'data: {
    agent_key: "copywriter",
    soul: "...new SOUL.md content...",
    role_content: "...new ROLE.md content...",
    identity: "...new IDENTITY.md content...",
    change_summary: "Made the copywriter more direct and concise"
  }'
)
WHERE agent_key = 'hr'
  AND skill_key = 'update-agent'
  AND markdown_content LIKE '%action: "update_agent"%'
  AND markdown_content NOT LIKE '%Made the copywriter more direct and concise%';

UPDATE public.agent_definitions
SET content = replace(
  content,
  '- `update_agent` — Update an agent''s identity (name, role, personality, communication style)',
  '- `update_agent` — Update an agent''s identity (name, role, personality, communication style). Always include `change_summary`: a human-readable checkpoint label about what changed.'
)
WHERE agent_key = 'hr'
  AND file_name = 'TOOLS.md'
  AND content LIKE '%`update_agent`%'
  AND content NOT LIKE '%human-readable checkpoint label%';
