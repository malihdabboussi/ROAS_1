-- Org-scoped unique index on agent_definitions.
-- Required for ON CONFLICT (org_id, agent_key, file_name) in
-- createAgentWithDefinitions. Must be non-partial because PostgREST
-- cannot reference partial indexes in ON CONFLICT clauses.
-- NULL org_id rows don't conflict with each other in PostgreSQL,
-- so the existing UNIQUE(user_id, agent_key, file_name) still
-- handles personal rows correctly.

DROP INDEX IF EXISTS agent_definitions_org_unique;

CREATE UNIQUE INDEX agent_definitions_org_unique
  ON public.agent_definitions(org_id, agent_key, file_name);
