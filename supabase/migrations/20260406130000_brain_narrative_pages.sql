-- ============================================================================
-- Brain Narrative Pages — Atlas's Knowledge Library
-- Creates the wiki layer for Atlas: narrative pages, cross-reference links,
-- brain evolution log, threshold counters on ns_brains, and atomic counter RPC.
-- ============================================================================

-- ─── ns_narrative_pages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_narrative_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  page_type text NOT NULL DEFAULT 'topic',
  content_md text NOT NULL DEFAULT '',
  summary text,
  source_refs jsonb DEFAULT '[]',
  last_synthesis_at timestamptz,
  version integer DEFAULT 1,
  embedding vector(768),
  tags text[] DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brain_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ns_np_brain ON ns_narrative_pages (brain_id);
CREATE INDEX IF NOT EXISTS idx_ns_np_type ON ns_narrative_pages (page_type);
CREATE INDEX IF NOT EXISTS idx_ns_np_status ON ns_narrative_pages (status);
CREATE INDEX IF NOT EXISTS idx_ns_np_brain_status ON ns_narrative_pages (brain_id, status);

ALTER TABLE ns_narrative_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ns_np_own ON ns_narrative_pages FOR ALL
  USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- org RLS policy deferred: depends on is_org_brain() from 20260401100000_replace_team_with_org_permissions.sql
-- CREATE POLICY org_ns_np_all ON ns_narrative_pages FOR ALL
--   USING (public.is_org_brain(brain_id))
--   WITH CHECK (public.is_org_brain(brain_id));

-- ─── ns_narrative_links ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_narrative_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_page_id uuid NOT NULL REFERENCES ns_narrative_pages(id) ON DELETE CASCADE,
  to_page_id uuid NOT NULL REFERENCES ns_narrative_pages(id) ON DELETE CASCADE,
  link_type text DEFAULT 'related',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_page_id, to_page_id)
);

CREATE INDEX IF NOT EXISTS idx_ns_nl_from ON ns_narrative_links (from_page_id);
CREATE INDEX IF NOT EXISTS idx_ns_nl_to ON ns_narrative_links (to_page_id);

ALTER TABLE ns_narrative_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY ns_nl_own ON ns_narrative_links FOR ALL
  USING (
    from_page_id IN (
      SELECT np.id FROM ns_narrative_pages np
      JOIN ns_brains b ON b.id = np.brain_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- org RLS policy deferred: depends on is_org_brain() from 20260401100000_replace_team_with_org_permissions.sql
-- CREATE POLICY org_ns_nl_all ON ns_narrative_links FOR ALL
--   USING (EXISTS (SELECT 1 FROM ns_narrative_pages np WHERE np.id = ns_narrative_links.from_page_id AND public.is_org_brain(np.brain_id)))
--   WITH CHECK (EXISTS (SELECT 1 FROM ns_narrative_pages np WHERE np.id = ns_narrative_links.from_page_id AND public.is_org_brain(np.brain_id)));

-- ─── ns_brain_log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ns_brain_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  affected_pages text[] DEFAULT '{}',
  source_ref jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ns_bl_brain ON ns_brain_log (brain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ns_bl_type ON ns_brain_log (event_type);

ALTER TABLE ns_brain_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ns_bl_own ON ns_brain_log FOR ALL
  USING (brain_id IN (SELECT id FROM ns_brains WHERE owner_id = auth.uid()));

-- org RLS policy deferred: depends on is_org_brain() from 20260401100000_replace_team_with_org_permissions.sql
-- CREATE POLICY org_ns_bl_all ON ns_brain_log FOR ALL
--   USING (public.is_org_brain(brain_id))
--   WITH CHECK (public.is_org_brain(brain_id));

-- ─── ns_brains counter columns ──────────────────────────────────────────────
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS memories_since_last_sync integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_library_sync_at timestamptz;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS syncs_since_last_lint integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_lint_at timestamptz;

-- ─── ns_perspectives narrative column ───────────────────────────────────────
ALTER TABLE ns_perspectives ADD COLUMN IF NOT EXISTS narrative_md text;

-- ─── Semantic search across narrative pages ─────────────────────────────────
CREATE OR REPLACE FUNCTION search_narrative_pages(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric DEFAULT 0.3,
  p_match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  page_type text,
  summary text,
  content_md text,
  similarity numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    np.id, np.slug, np.title, np.page_type, np.summary, np.content_md,
    1 - (np.embedding <=> p_query_embedding) AS similarity
  FROM ns_narrative_pages np
  WHERE np.brain_id = p_brain_id
    AND np.status = 'active'
    AND np.embedding IS NOT NULL
    AND (1 - (np.embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY np.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- ─── Atomic counter increment (avoids race conditions) ─────────────────────
CREATE OR REPLACE FUNCTION increment_brain_counter(
  p_brain_id uuid,
  p_field text,
  p_amount integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_val integer;
BEGIN
  EXECUTE format(
    'UPDATE ns_brains SET %I = COALESCE(%I, 0) + $1 WHERE id = $2 RETURNING %I',
    p_field, p_field, p_field
  ) INTO new_val USING p_amount, p_brain_id;
  RETURN COALESCE(new_val, 0);
END;
$$;
