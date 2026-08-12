-- General-purpose campaign whiteboards. Program and Space surfaces resolve to a campaign board.

CREATE TABLE IF NOT EXISTS public.campaign_canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  viewport JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_canvases_campaign_unique UNIQUE (campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_canvases_user ON public.campaign_canvases(user_id);

ALTER TABLE public.campaign_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_canvases_view ON public.campaign_canvases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_org_campaign_access(campaign_id, 'view'));

CREATE POLICY campaign_canvases_create ON public.campaign_canvases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
    OR public.has_org_campaign_access(campaign_id, 'edit')
  ));

CREATE POLICY campaign_canvases_edit ON public.campaign_canvases
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_org_campaign_access(campaign_id, 'edit'))
  WITH CHECK (auth.uid() = user_id OR public.has_org_campaign_access(campaign_id, 'edit'));

CREATE POLICY campaign_canvases_delete ON public.campaign_canvases
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_org_campaign_access(campaign_id, 'edit'));

DROP TRIGGER IF EXISTS set_updated_at_campaign_canvases ON public.campaign_canvases;
CREATE TRIGGER set_updated_at_campaign_canvases
  BEFORE UPDATE ON public.campaign_canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_canvases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_canvases TO service_role;
