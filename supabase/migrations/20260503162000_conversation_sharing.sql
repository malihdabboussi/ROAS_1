BEGIN;

CREATE TABLE IF NOT EXISTS public.conversation_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  org_id UUID NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'org')),
  entity_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('view', 'edit', 'admin')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_shares_conversation_id
  ON public.conversation_shares (conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_shares_entity
  ON public.conversation_shares (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_conversation_shares_org_id
  ON public.conversation_shares (org_id);

ALTER TABLE public.conversation_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.org_role_for(p_org_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.org_members
  WHERE org_id = p_org_id
    AND user_id = p_user_id
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.conversation_effective_level(p_conversation_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH conversation_row AS (
    SELECT id, user_id, org_id
    FROM public.conversations
    WHERE id = p_conversation_id
  ),
  direct_owner AS (
    SELECT 'admin'::text AS level
    FROM conversation_row
    WHERE user_id = p_user_id
  ),
  explicit_shares AS (
    SELECT share.level
    FROM public.conversation_shares share
    JOIN conversation_row conversation ON conversation.id = share.conversation_id
    WHERE (
      share.entity_type = 'user'
      AND share.entity_id = p_user_id
    )
    OR (
      share.entity_type = 'org'
      AND conversation.org_id IS NOT NULL
      AND share.entity_id = conversation.org_id
      AND public.org_role_for(conversation.org_id, p_user_id) IS NOT NULL
    )
  ),
  admin_baseline AS (
    SELECT 'view'::text AS level
    FROM conversation_row
    WHERE org_id IS NOT NULL
      AND public.org_role_for(org_id, p_user_id) IN ('admin', 'owner')
  )
  SELECT level
  FROM (
    SELECT level FROM direct_owner
    UNION ALL
    SELECT level FROM explicit_shares
    UNION ALL
    SELECT level FROM admin_baseline
  ) levels
  ORDER BY CASE level
    WHEN 'admin' THEN 3
    WHEN 'edit' THEN 2
    WHEN 'view' THEN 1
    ELSE 0
  END DESC
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Org members can read org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conv read by share" ON public.conversations;
DROP POLICY IF EXISTS "Conv update by edit" ON public.conversations;
DROP POLICY IF EXISTS "Conv delete by admin" ON public.conversations;

CREATE POLICY "Conv read by share"
  ON public.conversations FOR SELECT
  USING (public.conversation_effective_level(id, auth.uid()) IS NOT NULL);

CREATE POLICY "Conv update by edit"
  ON public.conversations FOR UPDATE
  USING (public.conversation_effective_level(id, auth.uid()) IN ('edit', 'admin'))
  WITH CHECK (public.conversation_effective_level(id, auth.uid()) IN ('edit', 'admin'));

CREATE POLICY "Conv delete by admin"
  ON public.conversations FOR DELETE
  USING (public.conversation_effective_level(id, auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Org members can read org conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can insert org conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can write org messages" ON public.messages;
DROP POLICY IF EXISTS "Msg read by share" ON public.messages;
DROP POLICY IF EXISTS "Msg insert by edit" ON public.messages;

CREATE POLICY "Msg read by share"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, auth.uid()) IS NOT NULL
    )
  );

CREATE POLICY "Msg insert by edit"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, auth.uid()) IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "Org members can read org conversation_documents" ON public.conversation_documents;
DROP POLICY IF EXISTS "Org members can read org conversation documents" ON public.conversation_documents;
DROP POLICY IF EXISTS "Org members can write org conversation_documents" ON public.conversation_documents;
DROP POLICY IF EXISTS "ConvDoc read by share" ON public.conversation_documents;
DROP POLICY IF EXISTS "ConvDoc write by edit" ON public.conversation_documents;

CREATE POLICY "ConvDoc read by share"
  ON public.conversation_documents FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, auth.uid()) IS NOT NULL
    )
  );

CREATE POLICY "ConvDoc write by edit"
  ON public.conversation_documents FOR ALL
  USING (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, auth.uid()) IN ('edit', 'admin')
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT c.id
      FROM public.conversations c
      WHERE public.conversation_effective_level(c.id, auth.uid()) IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "ConvShares manage by admin" ON public.conversation_shares;
DROP POLICY IF EXISTS "ConvShares read own grants" ON public.conversation_shares;

CREATE POLICY "ConvShares manage by admin"
  ON public.conversation_shares FOR ALL
  USING (public.conversation_effective_level(conversation_id, auth.uid()) = 'admin')
  WITH CHECK (public.conversation_effective_level(conversation_id, auth.uid()) = 'admin');

CREATE POLICY "ConvShares read own grants"
  ON public.conversation_shares FOR SELECT
  USING (
    (entity_type = 'user' AND entity_id = auth.uid())
    OR (entity_type = 'org' AND public.is_org_member(entity_id))
  );

COMMIT;
