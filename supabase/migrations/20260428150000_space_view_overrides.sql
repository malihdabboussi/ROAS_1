BEGIN;

-- 1) Per-user view config overrides for shared (team) spaces.
CREATE TABLE IF NOT EXISTS public.space_view_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_id TEXT NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, user_id, view_id)
);

CREATE INDEX idx_space_view_overrides_space_user
  ON public.space_view_overrides(space_id, user_id);

ALTER TABLE public.space_view_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own view overrides"
  ON public.space_view_overrides FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own view overrides"
  ON public.space_view_overrides FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own view overrides"
  ON public.space_view_overrides FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own view overrides"
  ON public.space_view_overrides FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE TRIGGER set_space_view_overrides_updated_at
  BEFORE UPDATE ON public.space_view_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Allow org admins/owners to update team spaces (for "Save for everyone").
CREATE POLICY "Org admins can update team spaces"
  ON public.spaces FOR UPDATE TO public
  USING (
    visibility = 'team'
    AND org_id IS NOT NULL
    AND public.is_org_admin_or_owner(org_id)
  )
  WITH CHECK (
    visibility = 'team'
    AND org_id IS NOT NULL
    AND public.is_org_admin_or_owner(org_id)
  );

COMMIT;
