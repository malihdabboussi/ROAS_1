-- Add source column to agent_skills to distinguish platform-provided vs user-created skills
ALTER TABLE agent_skills ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

-- Backfill system rows (platform-wide, no owner)
UPDATE agent_skills SET source = 'system'
WHERE user_id IS NULL AND org_id IS NULL;

-- Backfill default-seeded (skill-creator non-system copies)
UPDATE agent_skills SET source = 'default'
WHERE skill_key = 'skill-creator' AND source = 'user';

-- Backfill template-seeded (skill_key exists in template catalog)
UPDATE agent_skills SET source = 'template'
WHERE source = 'user'
  AND EXISTS(
    SELECT 1 FROM agent_template_skills t
    WHERE t.skill_key = agent_skills.skill_key
  );
