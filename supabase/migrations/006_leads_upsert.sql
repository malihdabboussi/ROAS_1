-- Migration: Fix leads duplicate email constraint violation
-- Change INSERT to upsert (ON CONFLICT DO UPDATE) so returning leads
-- get their data updated instead of throwing an error.
-- ============================================================================

-- First ensure we have a proper unique constraint on email
-- (The error references leads_user_email_unique — make sure it exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_user_email_unique'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_user_email_unique UNIQUE (email);
  END IF;
END $$;

-- Replace the function with upsert logic
CREATE OR REPLACE FUNCTION create_lead_secure(
  p_funnel_id     UUID,
  p_email         TEXT,
  p_name          TEXT DEFAULT NULL,
  p_phone         TEXT DEFAULT NULL,
  p_page_slug     TEXT DEFAULT NULL,
  p_source_domain TEXT DEFAULT NULL,
  p_utm           JSONB DEFAULT '{}'::jsonb,
  p_user_agent    TEXT DEFAULT NULL,
  p_ip            TEXT DEFAULT NULL,
  p_visitor_id    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id UUID;
BEGIN
  -- Validate funnel exists (if provided)
  IF p_funnel_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM funnels WHERE id = p_funnel_id) THEN
      RAISE EXCEPTION 'Funnel not found';
    END IF;
  END IF;

  -- Upsert: insert new lead or update existing one on duplicate email
  INSERT INTO leads (funnel_id, email, name, phone, page_slug, source_domain, utm, user_agent, ip, visitor_id)
  VALUES (p_funnel_id, p_email, p_name, p_phone, p_page_slug, p_source_domain, p_utm, p_user_agent, p_ip, p_visitor_id)
  ON CONFLICT (email) DO UPDATE SET
    funnel_id     = COALESCE(EXCLUDED.funnel_id, leads.funnel_id),
    name          = COALESCE(EXCLUDED.name, leads.name),
    phone         = COALESCE(EXCLUDED.phone, leads.phone),
    page_slug     = COALESCE(EXCLUDED.page_slug, leads.page_slug),
    source_domain = COALESCE(EXCLUDED.source_domain, leads.source_domain),
    utm           = CASE WHEN EXCLUDED.utm != '{}'::jsonb THEN EXCLUDED.utm ELSE leads.utm END,
    user_agent    = COALESCE(EXCLUDED.user_agent, leads.user_agent),
    ip            = COALESCE(EXCLUDED.ip, leads.ip),
    visitor_id    = COALESCE(EXCLUDED.visitor_id, leads.visitor_id),
    updated_at    = now()
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION create_lead_secure TO anon;
GRANT EXECUTE ON FUNCTION create_lead_secure TO authenticated;
