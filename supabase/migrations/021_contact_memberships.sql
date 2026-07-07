-- ============================================================================
-- Migration: Contact Memberships (Campaigns + Funnels)
-- Purpose:
-- - Allow a single contact (user_id+email) to be associated to multiple campaigns/funnels
-- - Make campaign leads queryable via membership tables (clean many-to-many)
-- - Support segments preview filters for campaigns/funnels via a DB function
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Membership tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_campaign_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_source_domain TEXT,
  last_page_slug TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_campaign_memberships_contact_campaign_unique
  ON contact_campaign_memberships(contact_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_contact_campaign_memberships_user_campaign
  ON contact_campaign_memberships(user_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_contact_campaign_memberships_campaign
  ON contact_campaign_memberships(campaign_id);

CREATE INDEX IF NOT EXISTS idx_contact_campaign_memberships_contact
  ON contact_campaign_memberships(contact_id);

CREATE TRIGGER set_updated_at_contact_campaign_memberships
  BEFORE UPDATE ON contact_campaign_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE contact_campaign_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_campaign_memberships_own
  ON contact_campaign_memberships
  FOR ALL
  USING (user_id = auth.uid());

-- Funnel membership

CREATE TABLE IF NOT EXISTS contact_funnel_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_source_domain TEXT,
  last_page_slug TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_funnel_memberships_contact_funnel_unique
  ON contact_funnel_memberships(contact_id, funnel_id);

CREATE INDEX IF NOT EXISTS idx_contact_funnel_memberships_user_funnel
  ON contact_funnel_memberships(user_id, funnel_id);

CREATE INDEX IF NOT EXISTS idx_contact_funnel_memberships_funnel
  ON contact_funnel_memberships(funnel_id);

CREATE INDEX IF NOT EXISTS idx_contact_funnel_memberships_contact
  ON contact_funnel_memberships(contact_id);

CREATE TRIGGER set_updated_at_contact_funnel_memberships
  BEFORE UPDATE ON contact_funnel_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE contact_funnel_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_funnel_memberships_own
  ON contact_funnel_memberships
  FOR ALL
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2) Backfill memberships from existing leads (best-effort)
-- ----------------------------------------------------------------------------

-- Backfill funnel memberships (requires contact exists)
INSERT INTO contact_funnel_memberships (
  user_id,
  contact_id,
  funnel_id,
  first_seen_at,
  last_seen_at,
  last_source_domain,
  last_page_slug,
  metadata
)
SELECT
  l.user_id,
  c.id AS contact_id,
  l.funnel_id,
  l.created_at AS first_seen_at,
  GREATEST(l.updated_at, l.created_at) AS last_seen_at,
  l.source_domain AS last_source_domain,
  l.page_slug AS last_page_slug,
  jsonb_build_object('backfilled_from', 'leads', 'lead_id', l.id)
FROM leads l
JOIN contacts c
  ON c.user_id = l.user_id
 AND lower(c.email) = lower(l.email)
WHERE l.is_archived = false
  AND l.funnel_id IS NOT NULL
ON CONFLICT (contact_id, funnel_id)
DO UPDATE SET
  last_seen_at = GREATEST(EXCLUDED.last_seen_at, contact_funnel_memberships.last_seen_at),
  last_source_domain = COALESCE(EXCLUDED.last_source_domain, contact_funnel_memberships.last_source_domain),
  last_page_slug = COALESCE(EXCLUDED.last_page_slug, contact_funnel_memberships.last_page_slug),
  updated_at = now();

-- Backfill campaign memberships (requires contact exists)
INSERT INTO contact_campaign_memberships (
  user_id,
  contact_id,
  campaign_id,
  source_funnel_id,
  first_seen_at,
  last_seen_at,
  last_source_domain,
  last_page_slug,
  metadata
)
SELECT
  l.user_id,
  c.id AS contact_id,
  l.campaign_id,
  l.funnel_id AS source_funnel_id,
  l.created_at AS first_seen_at,
  GREATEST(l.updated_at, l.created_at) AS last_seen_at,
  l.source_domain AS last_source_domain,
  l.page_slug AS last_page_slug,
  jsonb_build_object('backfilled_from', 'leads', 'lead_id', l.id)
FROM leads l
JOIN contacts c
  ON c.user_id = l.user_id
 AND lower(c.email) = lower(l.email)
WHERE l.is_archived = false
  AND l.campaign_id IS NOT NULL
ON CONFLICT (contact_id, campaign_id)
DO UPDATE SET
  last_seen_at = GREATEST(EXCLUDED.last_seen_at, contact_campaign_memberships.last_seen_at),
  source_funnel_id = COALESCE(EXCLUDED.source_funnel_id, contact_campaign_memberships.source_funnel_id),
  last_source_domain = COALESCE(EXCLUDED.last_source_domain, contact_campaign_memberships.last_source_domain),
  last_page_slug = COALESCE(EXCLUDED.last_page_slug, contact_campaign_memberships.last_page_slug),
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 3) Segment preview helper (filters: campaigns, funnels, tags, date_range)
-- ----------------------------------------------------------------------------

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
      NULLIF(p_filters #>> '{date_range,from}', '')::timestamptz AS from_ts,
      NULLIF(p_filters #>> '{date_range,to}', '')::timestamptz AS to_ts
  )
  SELECT COUNT(*)::int
  FROM contacts c, f
  WHERE c.user_id = auth.uid()
    AND (cardinality(f.tag_ids) = 0 OR (c.tags && f.tag_ids))
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

GRANT EXECUTE ON FUNCTION preview_segment_contacts(JSONB) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4) Unblock repeat opt-ins across campaigns
-- ----------------------------------------------------------------------------

-- The membership tables are the source of truth for multi-campaign association.
-- The leads table should not prevent repeated capture for the same contact.
DROP INDEX IF EXISTS leads_user_email_unique;

