-- Phase 5b: Stop the re-cloning at the source.
--
-- `agent_template_skills` and `template_skill_assignments` are read by
-- `MissionsRepository.upsertTemplateSkill` / `MissionSkillSeederService` to
-- clone skills into a per-user `agent_skills` row on user/org onboarding.
-- For system agents (atlas/vibey/hr/viktor + their template aliases
-- brain_scholar/widget_builder), there is no per-user clone path: they
-- read content from the canonical (NULL,NULL) row directly. Deleting
-- these template rows ensures the next user signup does not re-create
-- the dead per-user clones we just removed in Phase 6.

DELETE FROM public.template_skill_assignments
 WHERE template_key IN ('atlas','vibey','hr','viktor','brain_scholar','widget_builder');

DELETE FROM public.agent_template_skills
 WHERE template_key IN ('atlas','vibey','hr','viktor','brain_scholar','widget_builder');
