-- Per-user hide-from-sidebar for spaces (mirrors campaign_user_state.is_hidden).

ALTER TABLE public.space_user_state
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS space_user_state_user_hidden_idx
  ON public.space_user_state (user_id)
  WHERE is_hidden = true;
