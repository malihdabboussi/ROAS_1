-- Forms: campaign-scoped form artifacts and raw response storage.

CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT,
  share_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'auth', 'embed_only')),
  schema JSONB NOT NULL DEFAULT '{"questions":[]}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  space_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitter_email TEXT,
  submitter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forms_share_token ON public.forms(share_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_forms_campaign_slug ON public.forms(campaign_id, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forms_campaign ON public.forms(campaign_id);
CREATE INDEX IF NOT EXISTS idx_forms_org ON public.forms(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forms_space ON public.forms(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_responses_form ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_campaign ON public.form_responses(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_responses_org ON public.form_responses(org_id) WHERE org_id IS NOT NULL;

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_forms_all ON public.forms;
CREATE POLICY org_forms_all ON public.forms FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS owner_forms_all ON public.forms;
CREATE POLICY owner_forms_all ON public.forms FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS org_form_responses_select ON public.form_responses;
CREATE POLICY org_form_responses_select ON public.form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.forms f
      WHERE f.id = form_responses.form_id
        AND f.campaign_id IS NOT NULL
        AND f.org_id IS NOT NULL
        AND public.is_org_member(f.org_id)
    )
  );

DROP POLICY IF EXISTS owner_form_responses_select ON public.form_responses;
CREATE POLICY owner_form_responses_select ON public.form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.forms f
      WHERE f.id = form_responses.form_id
        AND f.user_id = auth.uid()
    )
  );

