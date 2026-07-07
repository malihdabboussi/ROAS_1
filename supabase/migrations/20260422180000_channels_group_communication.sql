-- ============================================================
-- CHANNELS: GROUP COMMUNICATION (humans + agents)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channels_org_id ON public.channels(org_id);
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON public.channels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_name_lower ON public.channels(lower(name));

CREATE TABLE IF NOT EXISTS public.channel_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  member_type TEXT NOT NULL CHECK (member_type IN ('user', 'agent')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_key TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT channel_memberships_member_identity_check CHECK (
    (member_type = 'user' AND user_id IS NOT NULL AND agent_key IS NULL) OR
    (member_type = 'agent' AND user_id IS NULL AND agent_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_memberships_user
  ON public.channel_memberships(channel_id, user_id)
  WHERE member_type = 'user' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_memberships_agent
  ON public.channel_memberships(channel_id, agent_key)
  WHERE member_type = 'agent' AND agent_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_memberships_channel_id
  ON public.channel_memberships(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_memberships_user_id
  ON public.channel_memberships(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
  sender_id TEXT NOT NULL,
  content TEXT,
  content_blocks JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reply_to_id UUID REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT channel_messages_content_required CHECK (
    content IS NOT NULL OR content_blocks IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_created
  ON public.channel_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_pinned
  ON public.channel_messages(channel_id, pinned, created_at DESC)
  WHERE pinned = true;

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions for role-aware channel authorization
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_memberships cm
    WHERE cm.channel_id = p_channel_id
      AND cm.member_type = 'user'
      AND cm.user_id = auth.uid()
  )
$$;

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
        OR (
          c.org_id IS NOT NULL
          AND public.is_org_member(c.org_id)
          AND (
            c.is_private = false
            OR public.is_channel_member(c.id)
            OR public.is_org_admin_or_owner(c.org_id)
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_channel_admin(p_channel_id UUID)
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
        OR (
          c.org_id IS NOT NULL
          AND public.is_org_admin_or_owner(c.org_id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.channel_memberships cm
          WHERE cm.channel_id = c.id
            AND cm.member_type = 'user'
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
      )
  )
$$;

-- ============================================================
-- channels policies
-- ============================================================

CREATE POLICY "Users can read accessible channels"
  ON public.channels FOR SELECT
  USING (public.can_access_channel(id));

CREATE POLICY "Users can create channels in personal/org scope"
  ON public.channels FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR public.is_org_member(org_id))
  );

CREATE POLICY "Channel admins can update channels"
  ON public.channels FOR UPDATE
  USING (public.is_channel_admin(id))
  WITH CHECK (
    (org_id IS NULL AND user_id = auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

CREATE POLICY "Channel admins can delete channels"
  ON public.channels FOR DELETE
  USING (public.is_channel_admin(id));

CREATE POLICY "Service role full access channels"
  ON public.channels FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- channel_memberships policies
-- ============================================================

CREATE POLICY "Users can read memberships for accessible channels"
  ON public.channel_memberships FOR SELECT
  USING (public.can_access_channel(channel_id));

CREATE POLICY "Channel admins can insert memberships"
  ON public.channel_memberships FOR INSERT
  WITH CHECK (public.is_channel_admin(channel_id));

CREATE POLICY "Channel admins can update memberships"
  ON public.channel_memberships FOR UPDATE
  USING (public.is_channel_admin(channel_id))
  WITH CHECK (public.is_channel_admin(channel_id));

CREATE POLICY "Channel admins can delete memberships"
  ON public.channel_memberships FOR DELETE
  USING (public.is_channel_admin(channel_id));

CREATE POLICY "Service role full access channel_memberships"
  ON public.channel_memberships FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- channel_messages policies
-- ============================================================

CREATE POLICY "Users can read channel messages"
  ON public.channel_messages FOR SELECT
  USING (public.can_access_channel(channel_id));

CREATE POLICY "Users can insert channel messages"
  ON public.channel_messages FOR INSERT
  WITH CHECK (
    public.can_access_channel(channel_id)
    AND (
      (sender_type = 'user' AND sender_id = auth.uid()::text)
      OR sender_type IN ('agent', 'system')
    )
  );

CREATE POLICY "Channel admins can update channel messages"
  ON public.channel_messages FOR UPDATE
  USING (public.is_channel_admin(channel_id))
  WITH CHECK (public.is_channel_admin(channel_id));

CREATE POLICY "Channel admins can delete channel messages"
  ON public.channel_messages FOR DELETE
  USING (public.is_channel_admin(channel_id));

CREATE POLICY "Service role full access channel_messages"
  ON public.channel_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Keep updated_at in sync for mutable channel records.
DROP TRIGGER IF EXISTS set_updated_at_channels ON public.channels;
CREATE TRIGGER set_updated_at_channels
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_channel_messages ON public.channel_messages;
CREATE TRIGGER set_updated_at_channel_messages
  BEFORE UPDATE ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
