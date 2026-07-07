-- Phase 6 (part A): Merge intentional 'custom' additions for Atlas SOUL.md
-- and TOOLS.md into the canonical (NULL,NULL) system rows. The custom
-- content is a superset of the canonical (system has 881/2287 chars,
-- custom has 2087/3891 chars adding `<product_rules>` + `<security>`
-- blocks for SOUL and the campaign + agent-SK routing actions for TOOLS).
-- Run BEFORE Phase 6 (part B) deletes the custom rows so we don't lose the
-- additions.
--
-- AGENTS.md / IDENTITY.md / ROLE.md customs match canonical content or are
-- stale single-row variants; nothing to merge there.

UPDATE public.agent_definitions sys
   SET content = src.content,
       updated_at = now()
  FROM (
    SELECT DISTINCT ON (length(content)) content
      FROM public.agent_definitions
     WHERE agent_key = 'atlas'
       AND file_name = 'SOUL.md'
       AND source = 'custom'
       AND length(content) = 2087
     LIMIT 1
  ) src
 WHERE sys.agent_key = 'atlas'
   AND sys.file_name = 'SOUL.md'
   AND sys.user_id IS NULL
   AND sys.org_id IS NULL;

UPDATE public.agent_definitions sys
   SET content = src.content,
       updated_at = now()
  FROM (
    SELECT DISTINCT ON (length(content)) content
      FROM public.agent_definitions
     WHERE agent_key = 'atlas'
       AND file_name = 'TOOLS.md'
       AND source = 'custom'
       AND length(content) = 3891
     LIMIT 1
  ) src
 WHERE sys.agent_key = 'atlas'
   AND sys.file_name = 'TOOLS.md'
   AND sys.user_id IS NULL
   AND sys.org_id IS NULL;
