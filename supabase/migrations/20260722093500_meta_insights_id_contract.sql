-- Keep Meta insight reads inside the active ROAS campaign scope and use local hierarchy row ids.
DO $migration$
DECLARE
  contract text := $contract$

## Native Meta insights ID contract

`get_meta_ads_insights` uses two different ID layers. Never interchange them:

- `campaign_id` is always the active ROAS campaign UUID. Keep it unchanged at campaign, ad-set, and ad level. Never put a Meta numeric ID or `row.meta_id` in `campaign_id`.
- Start with `level: campaign` and the requested `date_preset` such as `last_30d` or `previous_30d`.
- For `level: adset`, pass the selected campaign response `row.id` as `ad_campaign_id`.
- For `level: ad`, pass the selected ad-set response `row.id` as `ad_set_id`.
- Use `row.meta_id` only as evidence in the audit and recommendations.

When a preset is not supported, pass exact `start_date` and `end_date` values. Do not claim a reporting period unless those dates or a supported preset were actually sent.
$contract$;
BEGIN
  UPDATE public.skill_library
  SET markdown_content = CASE
        WHEN markdown_content LIKE '%## Native Meta insights ID contract%'
          THEN markdown_content
        ELSE markdown_content || contract
      END,
      updated_at = now()
  WHERE skill_key = 'roas-meta-ads-audit';

  UPDATE public.agent_skills AS skill
  SET markdown_content = library.markdown_content,
      name = library.name,
      description = library.description,
      updated_at = now()
  FROM public.skill_library AS library
  WHERE skill.skill_key = 'roas-meta-ads-audit'
    AND library.skill_key = skill.skill_key
    AND skill.source IN ('template', 'system', 'default');
END
$migration$;
