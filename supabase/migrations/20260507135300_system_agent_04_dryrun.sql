-- Phase 5: Dry-run report (informational; no destructive ops).
-- Run before Phase 6 to confirm the row counts that will be deleted.

DO $$
DECLARE
  v_skills        bigint;
  v_definitions   bigint;
  v_resources     bigint;
  v_templates     bigint;
  v_assignments   bigint;
  v_atlas_alt     bigint;
BEGIN
  SELECT COUNT(*) INTO v_skills
    FROM public.agent_skills
   WHERE agent_key IN ('atlas','vibey','hr','viktor')
     AND (user_id IS NOT NULL OR org_id IS NOT NULL);

  SELECT COUNT(*) INTO v_definitions
    FROM public.agent_definitions
   WHERE agent_key IN ('atlas','vibey','hr','viktor')
     AND (user_id IS NOT NULL OR org_id IS NOT NULL);

  SELECT COUNT(*) INTO v_resources
    FROM public.agent_skill_resources
   WHERE agent_key IN ('atlas','vibey','hr','viktor')
     AND (user_id IS NOT NULL OR org_id IS NOT NULL);

  SELECT COUNT(*) INTO v_templates
    FROM public.agent_template_skills
   WHERE template_key IN ('atlas','vibey','hr','viktor','brain_scholar','widget_builder');

  SELECT COUNT(*) INTO v_assignments
    FROM public.template_skill_assignments
   WHERE template_key IN ('atlas','vibey','hr','viktor','brain_scholar','widget_builder');

  SELECT
    (SELECT COUNT(*) FROM public.agent_skills WHERE agent_key IN ('atlas_2','atlas_3'))
    + (SELECT COUNT(*) FROM public.agent_definitions WHERE agent_key IN ('atlas_2','atlas_3'))
    INTO v_atlas_alt;

  RAISE NOTICE '=== System Agent Cleanup Dry-Run ===';
  RAISE NOTICE 'agent_skills clones to delete:           %', v_skills;
  RAISE NOTICE 'agent_definitions clones to delete:      %', v_definitions;
  RAISE NOTICE 'agent_skill_resources clones to delete:  %', v_resources;
  RAISE NOTICE 'agent_template_skills (system) to delete: %', v_templates;
  RAISE NOTICE 'template_skill_assignments (system) to delete: %', v_assignments;
  RAISE NOTICE 'atlas_2 + atlas_3 rows to delete:        %', v_atlas_alt;
END
$$;
