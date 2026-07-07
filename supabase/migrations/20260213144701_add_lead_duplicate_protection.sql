
-- Add unique index for deduplication (email + funnel_id)
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_funnel_unique
ON leads (email, funnel_id)
WHERE funnel_id IS NOT NULL AND is_archived = false;

-- Update create_lead_secure to handle duplicates via ON CONFLICT
CREATE OR REPLACE FUNCTION public.create_lead_secure(
  p_funnel_id uuid,
  p_email text,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_page_slug text DEFAULT NULL,
  p_source_domain text DEFAULT NULL,
  p_utm jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_visitor_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lead_id UUID;
  v_user_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Resolve user_id and campaign_id from funnel
  SELECT user_id, campaign_id INTO v_user_id, v_campaign_id
  FROM funnels WHERE id = p_funnel_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Funnel not found';
  END IF;

  -- Upsert: insert new lead or update existing (same email + funnel)
  INSERT INTO leads (user_id, funnel_id, campaign_id, email, name, phone, page_slug, source_domain, utm, user_agent, ip, visitor_id)
  VALUES (v_user_id, p_funnel_id, v_campaign_id, p_email, p_name, p_phone, p_page_slug, p_source_domain, p_utm, p_user_agent, p_ip, p_visitor_id)
  ON CONFLICT (email, funnel_id) WHERE funnel_id IS NOT NULL AND is_archived = false
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, leads.name),
    phone = COALESCE(EXCLUDED.phone, leads.phone),
    source_domain = COALESCE(EXCLUDED.source_domain, leads.source_domain),
    utm = COALESCE(EXCLUDED.utm, leads.utm),
    user_agent = EXCLUDED.user_agent,
    ip = EXCLUDED.ip,
    visitor_id = COALESCE(EXCLUDED.visitor_id, leads.visitor_id),
    updated_at = now()
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$function$;
;
