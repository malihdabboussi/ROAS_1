-- Phase 6: Pre-delete backup + delete per-user/per-org clones for system agents.
-- Phase 9: Delete atlas_2 / atlas_3 dev variants (approved).
--
-- Backup tables capture the rows being removed for rollback safety. Reverse
-- by INSERTing from the backup tables back into the live tables (skip the
-- system row constraint by running as service role, since the delete-source
-- still violates the post-Phase-7 RLS deny policies for non-service callers).

CREATE TABLE IF NOT EXISTS public.system_agent_cleanup_backup_skills (
  LIKE public.agent_skills INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.system_agent_cleanup_backup_definitions (
  LIKE public.agent_definitions INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.system_agent_cleanup_backup_resources (
  LIKE public.agent_skill_resources INCLUDING ALL
);

INSERT INTO public.system_agent_cleanup_backup_skills
SELECT * FROM public.agent_skills
 WHERE agent_key IN ('atlas','vibey','hr','viktor','atlas_2','atlas_3')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL OR agent_key IN ('atlas_2','atlas_3'));

INSERT INTO public.system_agent_cleanup_backup_definitions
SELECT * FROM public.agent_definitions
 WHERE agent_key IN ('atlas','vibey','hr','viktor','atlas_2','atlas_3')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL OR agent_key IN ('atlas_2','atlas_3'));

INSERT INTO public.system_agent_cleanup_backup_resources
SELECT * FROM public.agent_skill_resources
 WHERE agent_key IN ('atlas','vibey','hr','viktor','atlas_2','atlas_3')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL OR agent_key IN ('atlas_2','atlas_3'));

-- Delete per-user/per-org clones for system agents. Resources first to avoid
-- the (now redundant) skill->resource lookup paths surfacing orphans during
-- the delete window.
DELETE FROM public.agent_skill_resources
 WHERE agent_key IN ('atlas','vibey','hr','viktor')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL);

DELETE FROM public.agent_skills
 WHERE agent_key IN ('atlas','vibey','hr','viktor')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL);

DELETE FROM public.agent_definitions
 WHERE agent_key IN ('atlas','vibey','hr','viktor')
   AND (user_id IS NOT NULL OR org_id IS NOT NULL);

-- atlas_2 / atlas_3 dev variants (orphans owned by single user, no
-- application code references). Filesystem dirs and `docker/openclaw.json`
-- entries are removed in a separate non-DB step.
DELETE FROM public.agent_skills      WHERE agent_key IN ('atlas_2','atlas_3');
DELETE FROM public.agent_definitions WHERE agent_key IN ('atlas_2','atlas_3');
