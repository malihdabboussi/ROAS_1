-- Remove legacy Ad Campaigns template view; Ads now opens at campaign/structure level.

UPDATE public.space_templates
SET
  schema = jsonb_set(
    schema,
    '{views}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN view_value->>'type' = 'ads' THEN
            view_value || jsonb_build_object(
              'ads_config',
              COALESCE(view_value->'ads_config', '{}'::jsonb) ||
              jsonb_build_object('paid_ads_mode', 'structure')
            )
          ELSE view_value
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(schema->'views', '[]'::jsonb)) WITH ORDINALITY AS views(view_value, ord)
      WHERE view_value->>'type' <> 'ad_campaigns'
    ),
    true
  ),
  updated_at = now()
WHERE slug = 'marketing-campaign';
