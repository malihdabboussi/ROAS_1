-- ============================================================
-- DM CHANNELS: mark channels as direct messages
-- ============================================================

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_dm BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_channels_is_dm
  ON public.channels(org_id, is_dm)
  WHERE is_dm = true;

-- Helper: find existing DM channel between two users in an org
CREATE OR REPLACE FUNCTION public.find_dm_channel(
  p_org_id UUID,
  p_user_a UUID,
  p_user_b UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.channels c
  WHERE c.is_dm = true
    AND c.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM public.channel_memberships cm
      WHERE cm.channel_id = c.id AND cm.member_type = 'user' AND cm.user_id = p_user_a
    )
    AND EXISTS (
      SELECT 1 FROM public.channel_memberships cm
      WHERE cm.channel_id = c.id AND cm.member_type = 'user' AND cm.user_id = p_user_b
    )
  LIMIT 1
$$;
