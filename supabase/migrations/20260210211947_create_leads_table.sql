
-- Leads table: independent CRM contacts captured from funnels
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  phone text,
  contact_type text DEFAULT 'lead' CHECK (contact_type IN ('lead', 'customer')),
  source_domain text,
  page_slug text,
  utm jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_archived boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one lead per email per user
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_email_unique ON public.leads (user_id, lower(email));

-- Index for campaign lookups
CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON public.leads (campaign_id);

-- Index for funnel lookups
CREATE INDEX IF NOT EXISTS leads_funnel_id_idx ON public.leads (funnel_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON public.leads (user_id);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can manage their own leads
CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Public ingest function (SECURITY DEFINER - bypasses RLS for public form submissions)
CREATE OR REPLACE FUNCTION public.ingest_lead(
  p_email text,
  p_funnel_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_page_slug text DEFAULT NULL,
  p_source_domain text DEFAULT NULL,
  p_utm jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_campaign_id uuid;
  v_lead_id uuid;
BEGIN
  -- Look up the funnel to get user_id and campaign_id
  SELECT f.user_id, f.campaign_id INTO v_user_id, v_campaign_id
  FROM public.funnels f
  WHERE f.id = p_funnel_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Funnel not found');
  END IF;

  -- Upsert lead (insert or update if email already exists for this user)
  INSERT INTO public.leads (user_id, funnel_id, campaign_id, email, name, phone, page_slug, source_domain, utm)
  VALUES (v_user_id, p_funnel_id, v_campaign_id, lower(trim(p_email)), p_name, p_phone, p_page_slug, p_source_domain, p_utm)
  ON CONFLICT (user_id, lower(email))
  DO UPDATE SET
    funnel_id = COALESCE(EXCLUDED.funnel_id, leads.funnel_id),
    campaign_id = COALESCE(EXCLUDED.campaign_id, leads.campaign_id),
    name = COALESCE(EXCLUDED.name, leads.name),
    phone = COALESCE(EXCLUDED.phone, leads.phone),
    updated_at = now()
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', v_lead_id, 'user_id', v_user_id, 'campaign_id', v_campaign_id);
END;
$$;
;
