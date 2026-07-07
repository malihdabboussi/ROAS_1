-- Fix can_access_channel to allow explicitly-added members to access
-- personal channels (org_id IS NULL). Previously, only the channel owner
-- could access personal channels because is_channel_member was nested
-- inside the org-only branch.

CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channels c
    WHERE c.id = p_channel_id
      AND (
        c.user_id = auth.uid()
        OR public.is_channel_member(c.id)
        OR (
          c.org_id IS NOT NULL
          AND public.is_org_member(c.org_id)
          AND (
            c.is_private = false
            OR public.is_org_admin_or_owner(c.org_id)
          )
        )
      )
  )
$$;
