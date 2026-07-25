-- Fix programs INSERT…RETURNING under RLS.
--
-- Root cause: PostgREST/Nest create uses INSERT…RETURNING. SELECT policy called
-- has_program_access(id), which re-queries programs for that id. The in-flight
-- row is not visible yet → EXISTS false → RLS violation (even for org owners).
-- INSERT without RETURNING already succeeded; only the RETURNING SELECT failed.
--
-- Also align INSERT WITH CHECK with API @RequireOrgRole('creator').

BEGIN;

DROP POLICY IF EXISTS programs_select ON public.programs;
CREATE POLICY programs_select ON public.programs FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (
    org_id IS NOT NULL
    AND (
      -- Row-local checks (work during INSERT…RETURNING before self-join sees the row)
      created_by = auth.uid()
      OR (
        visibility = 'workspace'
        AND EXISTS (
          SELECT 1
          FROM public.org_members om
          WHERE om.org_id = programs.org_id
            AND om.user_id = auth.uid()
            AND om.status = 'active'
        )
      )
      OR public.has_program_access(id, 'view')
    )
  )
);

DROP POLICY IF EXISTS programs_insert ON public.programs;
CREATE POLICY programs_insert ON public.programs FOR INSERT WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (
    org_id IS NOT NULL
    AND user_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_members om
      WHERE om.org_id = programs.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'creator')
    )
  )
);

COMMIT;
