BEGIN;

ALTER TABLE public.space_automation_runs
  ALTER COLUMN automation_id DROP NOT NULL;

ALTER TABLE public.space_automation_runs
  ADD CONSTRAINT space_automation_runs_automation_id_fkey
  FOREIGN KEY (automation_id) REFERENCES public.space_automations(id) ON DELETE SET NULL;

ALTER TABLE public.space_automation_run_state
  ADD CONSTRAINT space_automation_run_state_automation_id_fkey
  FOREIGN KEY (automation_id) REFERENCES public.space_automations(id) ON DELETE CASCADE;

ALTER TABLE public.space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_automation_id_fkey
  FOREIGN KEY (automation_id) REFERENCES public.space_automations(id) ON DELETE CASCADE;

ALTER TABLE public.space_external_automation_events
  ADD CONSTRAINT space_external_automation_events_automation_id_fkey
  FOREIGN KEY (automation_id) REFERENCES public.space_automations(id) ON DELETE SET NULL;

ALTER TABLE public.space_contact_automation_routes
  ADD CONSTRAINT space_contact_automation_routes_automation_id_fkey
  FOREIGN KEY (automation_id) REFERENCES public.space_automations(id) ON DELETE CASCADE;

COMMIT;
