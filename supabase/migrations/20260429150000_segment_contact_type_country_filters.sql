-- Update preview_segment_contacts to support contact_type and country filters
CREATE OR REPLACE FUNCTION preview_segment_contacts(p_filters JSONB)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  WITH f AS (
    SELECT
      COALESCE(
        (SELECT array_agg(v) FROM jsonb_array_elements_text(p_filters->'tags') AS t(v)),
        '{}'::text[]
      ) AS tag_ids,
      COALESCE(
        (SELECT array_agg(v::uuid) FROM jsonb_array_elements_text(p_filters->'campaigns') AS t(v)),
        '{}'::uuid[]
      ) AS campaign_ids,
      COALESCE(
        (SELECT array_agg(v::uuid) FROM jsonb_array_elements_text(p_filters->'funnels') AS t(v)),
        '{}'::uuid[]
      ) AS funnel_ids,
      COALESCE(
        (SELECT array_agg(v) FROM jsonb_array_elements_text(p_filters->'contact_type') AS t(v)),
        '{}'::text[]
      ) AS contact_types,
      COALESCE(
        (SELECT array_agg(v) FROM jsonb_array_elements_text(p_filters->'country') AS t(v)),
        '{}'::text[]
      ) AS countries,
      NULLIF(p_filters #>> '{date_range,from}', '')::timestamptz AS from_ts,
      NULLIF(p_filters #>> '{date_range,to}', '')::timestamptz AS to_ts
  )
  SELECT COUNT(*)::int
  FROM contacts c, f
  WHERE c.user_id = auth.uid()
    AND (cardinality(f.tag_ids) = 0 OR (c.tags && f.tag_ids))
    AND (cardinality(f.contact_types) = 0 OR (c.contact_type = ANY(f.contact_types)))
    AND (cardinality(f.countries) = 0 OR (lower(c.country) = ANY(SELECT lower(unnest(f.countries)))))
    AND (f.from_ts IS NULL OR c.created_at >= f.from_ts)
    AND (f.to_ts IS NULL OR c.created_at <= f.to_ts)
    AND (
      cardinality(f.campaign_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM contact_campaign_memberships m
        WHERE m.user_id = c.user_id
          AND m.contact_id = c.id
          AND m.campaign_id = ANY (f.campaign_ids)
      )
    )
    AND (
      cardinality(f.funnel_ids) = 0
      OR EXISTS (
        SELECT 1
        FROM contact_funnel_memberships m
        WHERE m.user_id = c.user_id
          AND m.contact_id = c.id
          AND m.funnel_id = ANY (f.funnel_ids)
      )
    );
$$;

-- Helper RPCs for segment filter option dropdowns

CREATE OR REPLACE FUNCTION get_distinct_contact_tags()
RETURNS TEXT[]
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT tag ORDER BY tag), '{}'::text[])
  FROM contacts, unnest(tags) AS tag
  WHERE user_id = auth.uid() AND tag IS NOT NULL AND tag <> '';
$$;

GRANT EXECUTE ON FUNCTION get_distinct_contact_tags() TO authenticated;

CREATE OR REPLACE FUNCTION get_distinct_contact_countries()
RETURNS TEXT[]
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT country ORDER BY country), '{}'::text[])
  FROM contacts
  WHERE user_id = auth.uid() AND country IS NOT NULL AND country <> '';
$$;

GRANT EXECUTE ON FUNCTION get_distinct_contact_countries() TO authenticated;
