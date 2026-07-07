-- Atlas system agent: fix two canonical rows that have source='user' instead of 'system'.
-- These rows are at (NULL,NULL) scope (system rows) but were inserted with the column
-- default ('user' for agent_skills). Rename to keep source consistent with their scope.

UPDATE public.agent_skills
   SET source = 'system'
 WHERE agent_key = 'atlas'
   AND skill_key IN ('brain-library-lint', 'brain-pattern-analysis')
   AND user_id IS NULL
   AND org_id IS NULL
   AND source = 'user';
