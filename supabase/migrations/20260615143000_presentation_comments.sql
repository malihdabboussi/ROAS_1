-- Persist HTML presentation markup comments.

BEGIN;

CREATE TABLE IF NOT EXISTS public.presentation_comments (
  id UUID PRIMARY KEY,
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  space_id UUID NULL REFERENCES public.spaces(id) ON DELETE SET NULL,
  slide_index INTEGER NULL CHECK (slide_index IS NULL OR slide_index >= 0),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  element_trace JSONB NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS presentation_comments_presentation_resolved_created_idx
  ON public.presentation_comments (presentation_id, resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS presentation_comments_presentation_slide_idx
  ON public.presentation_comments (presentation_id, slide_index);

CREATE INDEX IF NOT EXISTS presentation_comments_anchor_idx
  ON public.presentation_comments (presentation_id, ((element_trace ->> 'anchor_id')))
  WHERE element_trace ? 'anchor_id';

ALTER TABLE public.presentation_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presentation_comments_parent_select ON public.presentation_comments;
CREATE POLICY presentation_comments_parent_select
  ON public.presentation_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_comments.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_comments_parent_insert ON public.presentation_comments;
CREATE POLICY presentation_comments_parent_insert
  ON public.presentation_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_comments.presentation_id
        AND p.org_id IS NOT DISTINCT FROM presentation_comments.org_id
        AND p.space_id IS NOT DISTINCT FROM presentation_comments.space_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_comments_parent_update ON public.presentation_comments;
CREATE POLICY presentation_comments_parent_update
  ON public.presentation_comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_comments.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_comments.presentation_id
        AND p.org_id IS NOT DISTINCT FROM presentation_comments.org_id
        AND p.space_id IS NOT DISTINCT FROM presentation_comments.space_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_comments_parent_delete ON public.presentation_comments;
CREATE POLICY presentation_comments_parent_delete
  ON public.presentation_comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_comments.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_comments TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at_presentation_comments ON public.presentation_comments;
CREATE TRIGGER set_updated_at_presentation_comments
  BEFORE UPDATE ON public.presentation_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMIT;
