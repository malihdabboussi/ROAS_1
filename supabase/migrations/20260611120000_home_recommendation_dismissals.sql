-- Daily recommendation strip: per-user per-workspace-context dismissals with 30-day snooze.
-- scope_key normalizes nullable org_id so the UNIQUE constraint dedupes personal-scope rows
-- and the API can use a plain upsert onConflict.

CREATE TABLE IF NOT EXISTS public.home_recommendation_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_key TEXT GENERATED ALWAYS AS (COALESCE(org_id::text, 'personal')) STORED,
  recommendation_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snoozed_until TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, scope_key, recommendation_key)
);

CREATE INDEX IF NOT EXISTS idx_home_rec_dismissals_lookup
  ON public.home_recommendation_dismissals(user_id, scope_key, snoozed_until);

ALTER TABLE public.home_recommendation_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_home_rec_dismissals_all ON public.home_recommendation_dismissals;
CREATE POLICY owner_home_rec_dismissals_all ON public.home_recommendation_dismissals
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
