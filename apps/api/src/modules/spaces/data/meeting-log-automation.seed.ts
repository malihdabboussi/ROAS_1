/**
 * The Meetings-space rule every note taker lands on (Fathom, Fireflies,
 * Read AI, defined tools). The Personal Dashboard template seeds it on new
 * spaces; `SpaceAutomationService.ensureMeetingLogAutomation` installs it on
 * existing Meetings spaces that lack it, so a recording always has a route.
 */
export const MEETING_LOG_TRIGGER_TYPE = 'external_fathom_recording_ready'

export const MEETING_LOG_AUTOMATION_SEED = {
  name: 'Fathom Meeting Log',
  trigger: { type: MEETING_LOG_TRIGGER_TYPE, source: { mode: 'self' } },
  actions: [
    { type: 'change_status', status: 'processing' },
    { type: 'change_status', status: 'needs_follow_up' },
    // Enrich exact action_items into follow_ups; do not invent when empty.
    {
      type: 'agent_suggest_tasks',
      agent_key: 'vibey',
      max_suggestions: 25,
      instructions:
        'Only turn payload.action_items into tasks. If action_items is empty, return {"tasks":[]}. Do not invent tasks from the transcript or summary.',
    },
    {
      type: 'request_slack_follow_up_confirm',
      meeting_scope: 'client_and_team',
      delivery_mode: 'shadow',
      channel_delivery: 'disabled',
      destination_channel_id: 'C0BN7P2BWRM',
      dm_email: 'dylan@dylanvanas.com',
      confirm_reaction: 'white_check_mark',
    },
  ] as Record<string, unknown>[],
  sort_order: 2,
}
