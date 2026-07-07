BEGIN;

ALTER TABLE public.space_items
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_link_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token UUID;

CREATE TABLE IF NOT EXISTS public.space_item_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  org_id UUID,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'org')),
  entity_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('full_edit', 'edit', 'comment', 'view')),
  inherit_to_children BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_space_item_shares_item_id
  ON public.space_item_shares(item_id);

CREATE INDEX IF NOT EXISTS idx_space_item_shares_space_id
  ON public.space_item_shares(space_id);

CREATE INDEX IF NOT EXISTS idx_space_item_shares_entity
  ON public.space_item_shares(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_space_item_shares_org_id
  ON public.space_item_shares(org_id);

ALTER TABLE public.space_item_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read space item shares" ON public.space_item_shares;
DROP POLICY IF EXISTS "Users can insert space item shares" ON public.space_item_shares;
DROP POLICY IF EXISTS "Users can update space item shares" ON public.space_item_shares;
DROP POLICY IF EXISTS "Users can delete space item shares" ON public.space_item_shares;

CREATE POLICY "Users can read space item shares"
  ON public.space_item_shares FOR SELECT TO public
  USING (
    auth.uid() = created_by
    OR (entity_type = 'user' AND entity_id = auth.uid())
    OR (entity_type = 'org' AND org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "Users can insert space item shares"
  ON public.space_item_shares FOR INSERT TO public
  WITH CHECK (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "Users can update space item shares"
  ON public.space_item_shares FOR UPDATE TO public
  USING (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "Users can delete space item shares"
  ON public.space_item_shares FOR DELETE TO public
  USING (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'space_item_shares'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.space_item_shares;
    END IF;
  END IF;
END
$$;

COMMIT;
