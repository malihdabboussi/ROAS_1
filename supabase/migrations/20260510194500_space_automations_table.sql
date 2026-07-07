BEGIN;

CREATE TABLE IF NOT EXISTS public.space_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  org_id UUID,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS space_automations_space_id_idx
  ON public.space_automations(space_id);

CREATE INDEX IF NOT EXISTS space_automations_org_id_idx
  ON public.space_automations(org_id);

CREATE INDEX IF NOT EXISTS space_automations_engine_idx
  ON public.space_automations(space_id, enabled, is_draft);

ALTER TABLE public.space_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own space automations"
  ON public.space_automations FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can read team space automations"
  ON public.space_automations FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = space_automations.space_id
      AND s.visibility = 'team'
      AND s.org_id IS NOT NULL
      AND public.is_org_member(s.org_id)
  ));

CREATE POLICY "Users can read shared space automations"
  ON public.space_automations FOR SELECT TO public
  USING (EXISTS (
    SELECT 1
    FROM public.space_shares ss
    JOIN public.spaces s ON s.id = ss.space_id
    WHERE ss.space_id = space_automations.space_id
      AND (
        (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
        OR (
          ss.entity_type = 'org'
          AND s.org_id IS NOT NULL
          AND ss.entity_id = s.org_id
          AND public.is_org_member(s.org_id)
        )
      )
  ));

CREATE POLICY "Users can insert own space automations"
  ON public.space_automations FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own space automations"
  ON public.space_automations FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org admins can update team space automations"
  ON public.space_automations FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = space_automations.space_id
      AND s.visibility = 'team'
      AND s.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(s.org_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = space_automations.space_id
      AND s.visibility = 'team'
      AND s.org_id IS NOT NULL
      AND public.is_org_admin_or_owner(s.org_id)
  ));

CREATE POLICY "Users can delete own space automations"
  ON public.space_automations FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE TRIGGER set_space_automations_updated_at
  BEFORE UPDATE ON public.space_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.space_automations (
  id,
  space_id,
  user_id,
  org_id,
  name,
  enabled,
  is_draft,
  trigger,
  actions,
  created_by,
  created_at,
  updated_at
)
SELECT
  COALESCE((a->>'id')::uuid, gen_random_uuid()),
  s.id,
  s.user_id,
  s.org_id,
  COALESCE(NULLIF(a->>'name', ''), 'Untitled'),
  COALESCE((a->>'enabled')::boolean, false),
  COALESCE((a->>'is_draft')::boolean, false),
  COALESCE(a->'trigger', '{}'::jsonb),
  COALESCE(a->'actions', '[]'::jsonb),
  COALESCE((a->>'created_by')::uuid, s.user_id),
  COALESCE((a->>'created_at')::timestamptz, now()),
  COALESCE((a->>'updated_at')::timestamptz, now())
FROM public.spaces s
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.schema->'automations', '[]'::jsonb)) a
WHERE jsonb_typeof(COALESCE(s.schema->'automations', '[]'::jsonb)) = 'array';

COMMIT;
