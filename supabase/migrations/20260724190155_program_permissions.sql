-- Program-level permissions: visibility + program_shares + has_program_access.
-- Default visibility=workspace preserves current org-wide Program visibility.
-- Campaigns with program_id inherit the Program gate via has_org_campaign_access.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. programs columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'workspace';

ALTER TABLE public.programs
  DROP CONSTRAINT IF EXISTS programs_visibility_check;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_visibility_check
  CHECK (visibility IN ('workspace', 'private', 'selected'));

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS programs_created_by_idx
  ON public.programs (created_by)
  WHERE created_by IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. program_shares
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('user')),
  entity_id uuid NOT NULL,
  level text NOT NULL CHECK (level IN ('view', 'edit')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_program_shares_program_id
  ON public.program_shares (program_id);

CREATE INDEX IF NOT EXISTS idx_program_shares_entity
  ON public.program_shares (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_program_shares_org_id
  ON public.program_shares (org_id)
  WHERE org_id IS NOT NULL;

ALTER TABLE public.program_shares ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. has_program_access
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_program_access(
  p_program_id uuid,
  p_min_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.id = p_program_id
      AND p.deleted_at IS NULL
      AND (
        -- Personal-account programs: owner only
        (p.user_id IS NOT NULL AND p.user_id = auth.uid())
        OR (
          p.org_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.org_members om
            WHERE om.org_id = p.org_id
              AND om.user_id = auth.uid()
              AND om.status = 'active'
              AND (
                -- Org admin/owner break-glass
                om.role IN ('owner', 'admin')
                -- Durable Program creator retains manage
                OR p.created_by = auth.uid()
                -- Workspace: all members view; editor+ mutate
                OR (
                  p.visibility = 'workspace'
                  AND (
                    p_min_level = 'view'
                    OR om.role IN ('owner', 'admin', 'creator', 'editor')
                  )
                )
                -- Private / Selected: ACL only (created_by handled above)
                OR (
                  p.visibility IN ('private', 'selected')
                  AND EXISTS (
                    SELECT 1
                    FROM public.program_shares ps
                    WHERE ps.program_id = p.id
                      AND ps.entity_type = 'user'
                      AND ps.entity_id = auth.uid()
                      AND (
                        p_min_level = 'view'
                        OR ps.level = 'edit'
                      )
                  )
                )
              )
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_program_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_program_access(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. programs RLS — SELECT/UPDATE/DELETE use Program access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS programs_select ON public.programs;
CREATE POLICY programs_select ON public.programs FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND public.has_program_access(id, 'view'))
);

DROP POLICY IF EXISTS programs_update ON public.programs;
CREATE POLICY programs_update ON public.programs FOR UPDATE USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND public.has_program_access(id, 'edit'))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND public.has_program_access(id, 'edit'))
);

DROP POLICY IF EXISTS programs_delete ON public.programs;
CREATE POLICY programs_delete ON public.programs FOR DELETE USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND public.has_program_access(id, 'edit'))
);

-- Insert stays creator/admin (unchanged intent)
DROP POLICY IF EXISTS programs_insert ON public.programs;
CREATE POLICY programs_insert ON public.programs FOR INSERT WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

-- ---------------------------------------------------------------------------
-- 5. program_shares RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS program_shares_select ON public.program_shares;
CREATE POLICY program_shares_select ON public.program_shares FOR SELECT USING (
  public.has_program_access(program_id, 'view')
);

DROP POLICY IF EXISTS program_shares_insert ON public.program_shares;
CREATE POLICY program_shares_insert ON public.program_shares FOR INSERT WITH CHECK (
  public.has_program_access(program_id, 'edit')
);

DROP POLICY IF EXISTS program_shares_update ON public.program_shares;
CREATE POLICY program_shares_update ON public.program_shares FOR UPDATE USING (
  public.has_program_access(program_id, 'edit')
) WITH CHECK (
  public.has_program_access(program_id, 'edit')
);

DROP POLICY IF EXISTS program_shares_delete ON public.program_shares;
CREATE POLICY program_shares_delete ON public.program_shares FOR DELETE USING (
  public.has_program_access(program_id, 'edit')
);

DROP POLICY IF EXISTS program_shares_service_all ON public.program_shares;
CREATE POLICY program_shares_service_all ON public.program_shares FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_shares TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Campaign access inherits Program gate when program_id is set
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_org_campaign_access(
  p_campaign_id UUID,
  p_min_permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.org_members om ON om.org_id = c.org_id
    LEFT JOIN public.org_campaign_permissions ocp
      ON ocp.org_member_id = om.id AND ocp.campaign_id = c.id
    WHERE c.id = p_campaign_id
      AND c.org_id IS NOT NULL
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND (
        c.program_id IS NULL
        OR public.has_program_access(
          c.program_id,
          CASE WHEN p_min_permission = 'view' THEN 'view' ELSE 'edit' END
        )
      )
      AND (
        p_min_permission = 'view'
        OR ocp.permission = 'edit'
        OR om.role IN ('owner', 'admin', 'creator')
      )
  );
$$;

COMMIT;
