CREATE POLICY "public_agents_readable" ON agents_registry
  FOR SELECT USING (public_page_enabled = true);

CREATE POLICY "public_agent_slug_readable" ON profiles
  FOR SELECT USING (public_agent_slug IS NOT NULL);
