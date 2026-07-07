ALTER TABLE space_external_automation_triggers
  DROP CONSTRAINT IF EXISTS space_external_automation_triggers_provider_check;

ALTER TABLE space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom', 'slack'));

ALTER TABLE space_external_automation_triggers
  DROP CONSTRAINT IF EXISTS space_external_automation_triggers_trigger_slug_check;

ALTER TABLE space_external_automation_triggers
  ADD CONSTRAINT space_external_automation_triggers_trigger_slug_check
  CHECK (
    trigger_slug IN (
      'GMAIL_NEW_GMAIL_MESSAGE',
      'OUTLOOK_MESSAGE_TRIGGER',
      'FATHOM_RECORDING_READY',
      'SLACK_RECEIVE_DIRECT_MESSAGE',
      'SLACK_CHANNEL_MESSAGE_RECEIVED',
      'SLACK_RECEIVE_THREAD_REPLY',
      'SLACKBOT_RECEIVE_DIRECT_MESSAGE',
      'SLACKBOT_CHANNEL_MESSAGE_RECEIVED',
      'SLACKBOT_RECEIVE_THREAD_REPLY'
    )
  );

ALTER TABLE space_external_automation_events
  DROP CONSTRAINT IF EXISTS space_external_automation_events_provider_check;

ALTER TABLE space_external_automation_events
  ADD CONSTRAINT space_external_automation_events_provider_check
  CHECK (provider IN ('gmail', 'outlook', 'fathom', 'slack'));
