-- ============================================================================
-- Migration: Add leads table + create_lead_secure RPC function
-- Missing from initial schema.sql — required by leads module
-- ============================================================================

-- leads — captured lead data from funnel opt-ins
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id       UUID REFERENCES funnels(id) ON DELETE SET NULL,
  email           TEXT NOT NULL,
  name            TEXT,
  phone           TEXT,
  page_slug       TEXT,
  source_domain   TEXT,
  utm             JSONB DEFAULT '{}'::jsonb,
  user_agent      TEXT,
  ip              TEXT,
  visitor_id      TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_funnel ON leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Leads are readable by the funnel owner
CREATE POLICY leads_own ON leads
  FOR ALL USING (
    funnel_id IN (SELECT id FROM funnels WHERE user_id = auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- create_lead_secure — SECURITY DEFINER function for anonymous lead ingestion
-- Bypasses RLS so unauthenticated visitors can submit opt-in forms
-- ============================================================================

CREATE OR REPLACE FUNCTION create_lead_secure(
  p_funnel_id   UUID,
  p_email       TEXT,
  p_name        TEXT DEFAULT NULL,
  p_phone       TEXT DEFAULT NULL,
  p_page_slug   TEXT DEFAULT NULL,
  p_source_domain TEXT DEFAULT NULL,
  p_utm         JSONB DEFAULT '{}'::jsonb,
  p_user_agent  TEXT DEFAULT NULL,
  p_ip          TEXT DEFAULT NULL,
  p_visitor_id  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_lead_id UUID;
BEGIN
  INSERT INTO leads (funnel_id, email, name, phone, page_slug, source_domain, utm, user_agent, ip, visitor_id)
  VALUES (p_funnel_id, p_email, p_name, p_phone, p_page_slug, p_source_domain, p_utm, p_user_agent, p_ip, p_visitor_id)
  RETURNING id INTO new_lead_id;

  RETURN new_lead_id;
END;
$$;

-- Grant anon access to the RPC function (needed for public opt-in forms)
GRANT EXECUTE ON FUNCTION create_lead_secure TO anon;
GRANT EXECUTE ON FUNCTION create_lead_secure TO authenticated;
