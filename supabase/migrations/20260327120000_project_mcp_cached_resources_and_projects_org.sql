-- MCP cached resources + org-aware RLS for project_mcp_servers

ALTER TABLE public.project_mcp_servers
  ADD COLUMN IF NOT EXISTS cached_resources JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_mcp_servers' AND policyname = 'Project members can manage MCP servers'
  ) THEN
    DROP POLICY "Project members can manage MCP servers" ON public.project_mcp_servers;
  END IF;
END $$;

CREATE POLICY "Project members can manage MCP servers"
  ON public.project_mcp_servers FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM public.project_repos p
      WHERE (p.user_id = auth.uid() AND p.org_id IS NULL)
         OR (
           p.org_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM public.org_members om
             WHERE om.org_id = p.org_id
               AND om.user_id = auth.uid()
               AND om.status = 'active'
           )
         )
    )
  );
