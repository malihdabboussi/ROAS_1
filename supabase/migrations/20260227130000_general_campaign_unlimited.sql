-- Remove campaign caps and bootstrap one visible General campaign per user.

UPDATE subscription_plans
SET max_campaigns = NULL
WHERE max_campaigns IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_single_general_per_user
ON campaigns(user_id)
WHERE COALESCE(config->>'system_kind', '') = 'general' AND status <> 'archived';

INSERT INTO campaigns (user_id, name, campaign_type, status, config)
SELECT
  p.id,
  'General',
  'get-more-leads',
  'active',
  jsonb_build_object(
    'system_kind', 'general',
    'isPinned', true,
    'isSystem', true,
    'icon', 'folder-kanban'
  )
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM campaigns c
  WHERE c.user_id = p.id
    AND COALESCE(c.config->>'system_kind', '') = 'general'
    AND c.status <> 'archived'
);

UPDATE conversations con
SET campaign_id = gen.id
FROM campaigns gen
WHERE con.user_id = gen.user_id
  AND con.campaign_id IS NULL
  AND COALESCE(gen.config->>'system_kind', '') = 'general'
  AND gen.status <> 'archived';
