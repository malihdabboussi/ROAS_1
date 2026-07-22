-- Programs: grouping layer above campaigns (ClickUp Space ≈ Program).
-- ROAS-org-first: seed Clients + ROAS Ops per org; no personal-account backfill.

BEGIN;

CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  system_kind text NULL CHECK (
    system_kind IS NULL OR system_kind IN ('clients', 'roas_ops', 'personal')
  ),
  icon text NULL,
  icon_color text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT programs_owner_chk CHECK (
    (org_id IS NOT NULL AND user_id IS NULL)
    OR (org_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS programs_org_slug_active_unique
  ON public.programs (org_id, slug)
  WHERE org_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS programs_user_slug_active_unique
  ON public.programs (user_id, slug)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS programs_org_system_kind_active_unique
  ON public.programs (org_id, system_kind)
  WHERE org_id IS NOT NULL AND system_kind IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS programs_user_system_kind_active_unique
  ON public.programs (user_id, system_kind)
  WHERE user_id IS NOT NULL AND system_kind IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS programs_org_idx
  ON public.programs (org_id)
  WHERE org_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS programs_user_idx
  ON public.programs (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_program_id
  ON public.campaigns (program_id)
  WHERE deleted_at IS NULL AND program_id IS NOT NULL;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS programs_select ON public.programs;
CREATE POLICY programs_select ON public.programs FOR SELECT USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_member(org_id))
);

DROP POLICY IF EXISTS programs_insert ON public.programs;
CREATE POLICY programs_insert ON public.programs FOR INSERT WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS programs_update ON public.programs;
CREATE POLICY programs_update ON public.programs FOR UPDATE USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
) WITH CHECK (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS programs_delete ON public.programs;
CREATE POLICY programs_delete ON public.programs FOR DELETE USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (org_id IS NOT NULL AND user_id IS NULL AND public.is_org_admin_or_owner(org_id))
);

DROP POLICY IF EXISTS programs_service_all ON public.programs;
CREATE POLICY programs_service_all ON public.programs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed Clients + ROAS Ops for every org (idempotent).
INSERT INTO public.programs (org_id, user_id, name, slug, system_kind, icon, sort_order)
SELECT o.id, NULL, 'Clients', 'clients', 'clients', 'users', 0
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.programs p
  WHERE p.org_id = o.id AND p.slug = 'clients' AND p.deleted_at IS NULL
);

INSERT INTO public.programs (org_id, user_id, name, slug, system_kind, icon, sort_order)
SELECT o.id, NULL, 'ROAS Ops', 'roas-ops', 'roas_ops', 'briefcase', 1
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.programs p
  WHERE p.org_id = o.id AND p.slug = 'roas-ops' AND p.deleted_at IS NULL
);

-- Backfill Page Grader client campaigns into Clients.
UPDATE public.campaigns c
SET program_id = p.id,
    updated_at = now()
FROM public.programs p
WHERE c.org_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND c.program_id IS NULL
  AND p.org_id = c.org_id
  AND p.system_kind = 'clients'
  AND p.deleted_at IS NULL
  AND (
    coalesce(c.config->>'source', '') = 'page_grader'
    OR (c.config->'external_sources'->'page_grader') IS NOT NULL
  );

COMMIT;
