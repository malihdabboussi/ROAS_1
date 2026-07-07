-- Add "Updating Existing Agents" section to the HR agent-design skill
-- so HR knows it can use update_agent to modify identity files post-hire.

UPDATE agent_template_skills
SET markdown_content = markdown_content || E'\n\n## Updating Existing Agents\n\nWhen a user wants to change an existing agent''s personality, tone, role, or identity, use `update_agent` instead of creating a new one.\n\nPass the same parameters as create_agent — only include the fields you want to change:\n- `agent_key` (required) — which agent to update\n- `soul` -> replaces SOUL.md content\n- `role_content` -> replaces ROLE.md content\n- `identity` -> replaces IDENTITY.md content\n- `name` -> updates the agent''s display name\n- `role` -> updates the agent''s job title\n\nExample: user says "make the copywriter more aggressive"\n1. Design the updated SOUL.md with the new tone and personality\n2. Call `update_agent` with `agent_key` and `soul` containing the new content\n3. The system updates the definition file and syncs it to the agent runtime immediately\n\nYou cannot update system agents (vibey, hr, brain_scholar, atlas). Only agents that were hired through the library or created via create_agent can be updated.'
WHERE template_key = 'hr'
  AND skill_key = 'agent-design';
