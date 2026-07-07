-- Org-scoped agent skill resources (user_id IS NULL, org_id set) were covered by
-- agent_skill_resources_system_unique ON (agent_key, skill_key, file_path) WHERE user_id IS NULL,
-- which did not include org_id — cross-tenant collisions when the same agent_key + paths
-- were hired in different orgs (e.g. designer "Lux" -> agent_key lux + carousel-designer files).
-- Mirror agent_skills: global system rows unique when org_id IS NULL; org rows unique per org_id.

DROP INDEX IF EXISTS public.agent_skill_resources_system_unique;

CREATE UNIQUE INDEX agent_skill_resources_system_unique
  ON public.agent_skill_resources (agent_key, skill_key, file_path)
  WHERE user_id IS NULL AND org_id IS NULL;

CREATE UNIQUE INDEX agent_skill_resources_org_unique
  ON public.agent_skill_resources (org_id, agent_key, skill_key, file_path)
  WHERE user_id IS NULL AND org_id IS NOT NULL;
