-- Durable graph edges for Space semantic objects.
-- Structural edges are deterministic; inferred edges are reserved for a later Atlas pass.

CREATE TABLE IF NOT EXISTS public.space_semantic_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('personal', 'org')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  campaign_id uuid,
  from_object_id uuid NOT NULL REFERENCES public.space_semantic_objects(id) ON DELETE CASCADE,
  to_object_id uuid NOT NULL REFERENCES public.space_semantic_objects(id) ON DELETE CASCADE,
  from_source_type text NOT NULL,
  from_source_id text NOT NULL,
  to_source_type text NOT NULL,
  to_source_id text NOT NULL,
  edge_type text NOT NULL,
  edge_class text NOT NULL CHECK (edge_class IN ('structural', 'inferred')),
  confidence numeric NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  strength numeric NOT NULL DEFAULT 1 CHECK (strength >= 0 AND strength <= 1),
  reason text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_space_semantic_edges_active_unique
  ON public.space_semantic_edges (
    from_source_type,
    from_source_id,
    to_source_type,
    to_source_id,
    edge_type
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_edges_scope
  ON public.space_semantic_edges (scope_type, user_id, org_id, space_id, campaign_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_edges_from_object
  ON public.space_semantic_edges (from_object_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_edges_to_object
  ON public.space_semantic_edges (to_object_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_edges_from_source
  ON public.space_semantic_edges (from_source_type, from_source_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_space_semantic_edges_to_source
  ON public.space_semantic_edges (to_source_type, to_source_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.space_semantic_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_semantic_edges_select ON public.space_semantic_edges;
CREATE POLICY space_semantic_edges_select
  ON public.space_semantic_edges FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.space_semantic_objects o
        WHERE o.id = space_semantic_edges.from_object_id
      )
      OR EXISTS (
        SELECT 1 FROM public.space_semantic_objects o
        WHERE o.id = space_semantic_edges.to_object_id
      )
    )
  );

DROP POLICY IF EXISTS space_semantic_edges_write ON public.space_semantic_edges;
CREATE POLICY space_semantic_edges_write
  ON public.space_semantic_edges FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND has_space_write_access(space_id, org_id))
  );

DROP POLICY IF EXISTS space_semantic_edges_service_all ON public.space_semantic_edges;
CREATE POLICY space_semantic_edges_service_all
  ON public.space_semantic_edges FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
