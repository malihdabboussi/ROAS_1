BEGIN;

UPDATE public.space_automations AS automation
SET
  actions = automation.actions || jsonb_build_array(
    jsonb_build_object(
      'type', 'request_slack_follow_up_confirm',
      'meeting_scope', 'client',
      'delivery_mode', 'shadow',
      'channel_delivery', 'disabled',
      'destination_channel_id', 'C0BN7P2BWRM',
      'dm_email', 'dylan@dylanvanas.com',
      'confirm_reaction', 'white_check_mark'
    )
  ),
  updated_at = now()
WHERE automation.name = 'Fathom Meeting Log'
  AND automation.trigger->>'type' = 'external_fathom_recording_ready'
  AND NOT automation.actions @> '[{"type":"request_slack_follow_up_confirm"}]'::jsonb;

COMMIT;
