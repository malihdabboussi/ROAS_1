ALTER TABLE space_external_automation_triggers
  DROP CONSTRAINT IF EXISTS space_external_automation_triggers_provider_check;

ALTER TABLE space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom'));

ALTER TABLE space_external_automation_triggers
  DROP CONSTRAINT IF EXISTS space_external_automation_triggers_trigger_slug_check;

ALTER TABLE space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_trigger_slug_check
  CHECK (trigger_slug IN ('GMAIL_NEW_GMAIL_MESSAGE', 'OUTLOOK_MESSAGE_TRIGGER', 'FATHOM_RECORDING_READY'));

ALTER TABLE space_external_automation_events
  DROP CONSTRAINT IF EXISTS space_external_automation_events_provider_check;

ALTER TABLE space_external_automation_events
  ADD CONSTRAINT space_external_automation_events_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom'));
