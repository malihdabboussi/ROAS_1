-- DRY RUN SCRIPT: org_id backfill planning
-- Run in a Supabase BRANCH first. Do not run blindly in production.

-- 1) Inventory null org rows in key tables
SELECT 'campaigns' AS table_name, COUNT(*) AS null_org_rows
FROM public.campaigns
WHERE org_id IS NULL AND deleted_at IS NULL
UNION ALL
SELECT 'missions', COUNT(*) FROM public.missions WHERE org_id IS NULL
UNION ALL
SELECT 'agents_registry', COUNT(*) FROM public.agents_registry WHERE org_id IS NULL
UNION ALL
SELECT 'conversations', COUNT(*) FROM public.conversations WHERE org_id IS NULL
UNION ALL
SELECT 'media_assets', COUNT(*) FROM public.media_assets WHERE org_id IS NULL;

-- 2) Preview ambiguous users (users in multiple active orgs)
SELECT user_id, COUNT(*) AS active_org_count
FROM public.org_members
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY active_org_count DESC;

-- 3) Candidate mapping table for deterministic backfill
-- Create temporary mapping first, review manually.
DROP TABLE IF EXISTS tmp_user_primary_org;
CREATE TEMP TABLE tmp_user_primary_org AS
SELECT DISTINCT ON (user_id)
  user_id,
  org_id
FROM public.org_members
WHERE status = 'active'
ORDER BY user_id, created_at ASC;

-- 4) Preview updates (no mutation)
SELECT c.id, c.user_id, t.org_id AS target_org_id
FROM public.campaigns c
JOIN tmp_user_primary_org t ON t.user_id = c.user_id
WHERE c.org_id IS NULL
LIMIT 100;

-- 5) Apply example backfill (uncomment only after review)
-- UPDATE public.campaigns c
-- SET org_id = t.org_id
-- FROM tmp_user_primary_org t
-- WHERE c.user_id = t.user_id
--   AND c.org_id IS NULL;

