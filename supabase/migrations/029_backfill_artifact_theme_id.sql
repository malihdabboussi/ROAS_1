-- Phase 6: Backfill artifact theme_id from campaign agent_settings.theme_id.
-- Safety rules:
-- - only fills NULL artifact theme_id
-- - only uses valid UUID values
-- - keeps user scope by joining campaign + artifact user_id
-- - never overwrites explicit artifact-level theme choices

WITH campaign_theme AS (
  SELECT
    c.id AS campaign_id,
    c.user_id,
    (c.config -> 'agent_settings' ->> 'theme_id') AS raw_theme_id
  FROM public.campaigns c
)
UPDATE public.funnels f
SET theme_id = ct.raw_theme_id::uuid
FROM campaign_theme ct
WHERE f.theme_id IS NULL
  AND f.campaign_id = ct.campaign_id
  AND f.user_id = ct.user_id
  AND ct.raw_theme_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

WITH campaign_theme AS (
  SELECT
    c.id AS campaign_id,
    c.user_id,
    (c.config -> 'agent_settings' ->> 'theme_id') AS raw_theme_id
  FROM public.campaigns c
)
UPDATE public.lead_magnets lm
SET theme_id = ct.raw_theme_id::uuid
FROM campaign_theme ct
WHERE lm.theme_id IS NULL
  AND lm.campaign_id = ct.campaign_id
  AND lm.user_id = ct.user_id
  AND ct.raw_theme_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

WITH campaign_theme AS (
  SELECT
    c.id AS campaign_id,
    c.user_id,
    (c.config -> 'agent_settings' ->> 'theme_id') AS raw_theme_id
  FROM public.campaigns c
)
UPDATE public.ads a
SET theme_id = ct.raw_theme_id::uuid
FROM campaign_theme ct
WHERE a.theme_id IS NULL
  AND a.campaign_id = ct.campaign_id
  AND a.user_id = ct.user_id
  AND ct.raw_theme_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Phase 6: Backfill artifact theme_id from campaign config.
-- Only fills NULL artifact theme_id values and never overwrites explicit choices.

DO $$
DECLARE
  theme_table text;
  uuid_regex constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF to_regclass('public.branding_themes') IS NOT NULL THEN
    theme_table := 'branding_themes';
  ELSIF to_regclass('public.themes') IS NOT NULL THEN
    theme_table := 'themes';
  ELSE
    theme_table := NULL;
  END IF;

  IF theme_table IS NULL THEN
    RAISE NOTICE 'Skipping artifact theme backfill: no themes table found.';
    RETURN;
  END IF;

  EXECUTE format($sql$
    WITH campaign_theme AS (
      SELECT
        c.id AS campaign_id,
        CASE
          WHEN (c.config->'agent_settings'->>'theme_id') ~* '%s'
            THEN (c.config->'agent_settings'->>'theme_id')::uuid
          ELSE NULL
        END AS theme_id
      FROM public.campaigns c
    ),
    valid_campaign_theme AS (
      SELECT
        ct.campaign_id,
        ct.theme_id
      FROM campaign_theme ct
      JOIN public.%I t ON t.id = ct.theme_id
      WHERE ct.theme_id IS NOT NULL
    )
    UPDATE public.funnels f
    SET theme_id = vct.theme_id
    FROM valid_campaign_theme vct
    WHERE f.campaign_id = vct.campaign_id
      AND f.theme_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.%I t
        WHERE t.id = vct.theme_id
          AND (t.user_id IS NULL OR t.user_id = f.user_id)
      )
  $sql$, uuid_regex, theme_table, theme_table);

  EXECUTE format($sql$
    WITH campaign_theme AS (
      SELECT
        c.id AS campaign_id,
        CASE
          WHEN (c.config->'agent_settings'->>'theme_id') ~* '%s'
            THEN (c.config->'agent_settings'->>'theme_id')::uuid
          ELSE NULL
        END AS theme_id
      FROM public.campaigns c
    ),
    valid_campaign_theme AS (
      SELECT
        ct.campaign_id,
        ct.theme_id
      FROM campaign_theme ct
      JOIN public.%I t ON t.id = ct.theme_id
      WHERE ct.theme_id IS NOT NULL
    )
    UPDATE public.lead_magnets lm
    SET theme_id = vct.theme_id
    FROM valid_campaign_theme vct
    WHERE lm.campaign_id = vct.campaign_id
      AND lm.theme_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.%I t
        WHERE t.id = vct.theme_id
          AND (t.user_id IS NULL OR t.user_id = lm.user_id)
      )
  $sql$, uuid_regex, theme_table, theme_table);

  EXECUTE format($sql$
    WITH campaign_theme AS (
      SELECT
        c.id AS campaign_id,
        CASE
          WHEN (c.config->'agent_settings'->>'theme_id') ~* '%s'
            THEN (c.config->'agent_settings'->>'theme_id')::uuid
          ELSE NULL
        END AS theme_id
      FROM public.campaigns c
    ),
    valid_campaign_theme AS (
      SELECT
        ct.campaign_id,
        ct.theme_id
      FROM campaign_theme ct
      JOIN public.%I t ON t.id = ct.theme_id
      WHERE ct.theme_id IS NOT NULL
    )
    UPDATE public.ads a
    SET theme_id = vct.theme_id
    FROM valid_campaign_theme vct
    WHERE a.campaign_id = vct.campaign_id
      AND a.theme_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.%I t
        WHERE t.id = vct.theme_id
          AND (t.user_id IS NULL OR t.user_id = a.user_id)
      )
  $sql$, uuid_regex, theme_table, theme_table);
END $$;

