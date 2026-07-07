-- Per-user state for campaigns: favorite (per-user star, distinct from
-- config.isPinned which is per-org/team) and hidden (removes from sidebar
-- without deleting; URL still works, restorable via menu).
--
-- Pairs with campaigns.status='archived' (already supported) for the new
-- campaign context menu actions.

CREATE TABLE IF NOT EXISTS public.campaign_user_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS campaign_user_state_user_idx
  ON public.campaign_user_state (user_id);

CREATE INDEX IF NOT EXISTS campaign_user_state_user_favorite_idx
  ON public.campaign_user_state (user_id)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS campaign_user_state_user_hidden_idx
  ON public.campaign_user_state (user_id)
  WHERE is_hidden = true;

ALTER TABLE public.campaign_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users select own campaign state"
  ON public.campaign_user_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users insert own campaign state"
  ON public.campaign_user_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users update own campaign state"
  ON public.campaign_user_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own campaign state" ON public.campaign_user_state;
CREATE POLICY "Users delete own campaign state"
  ON public.campaign_user_state
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
