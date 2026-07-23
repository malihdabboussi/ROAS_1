export const TEAM_OPS_DESK_MESSAGES = {
  GREETING_FALLBACK_NAME: 'there',
  BRIEFING_INTRO: "Here's what's happening with your team.",
  BRIEFING_EMPTY_FLOOR: "Nobody's on a mission right now.",
  BRIEFING_EMPTY_AUTOPILOT:
    'Autopilot is on — Vibey is watching. With campaign strategy set, it can create and assign missions on its own.',
  BRIEFING_PROMPT: "Tell Vibey what's on your mind, or assign someone below.",
  BRIEFING_PROMPT_AUTOPILOT:
    'You can still Talk to Vibey to deploy something now, or open Autopilot to set Result / Purpose / Strategy.',
  TALK_TO_VIBEY: 'Talk to Vibey',
  TALK_CONTEXT_LABEL: 'Ops Desk',
  AUTOPILOT_HINT:
    'Vibey watches your campaigns, creates and assigns missions from your strategy, retries stuck work, and can send a daily digest. Credits are used when agents run.',
  AUTOPILOT_OPEN_SETTINGS: 'Set strategy',
  IDLE_FOCUS: 'Nothing assigned',
  WORKING_NOW: 'Working now',
  FILTER_WORKING: 'Show working agents',
  FILTER_IDLE: 'Show idle agents',
  FILTER_CLEAR: 'Clear status filter',
  ASSIGN_WORK: 'Assign work',
  ASSIGN_MODAL_HEADING: 'ASSIGN WORK',
  ASSIGN_MODAL_SUBTITLE: 'Send a mission to this agent.',
  ASSIGN_NEED_CAMPAIGN: 'Pick a campaign so I know where this work belongs.',
  COUNTS_WORKING: 'working',
  COUNTS_IDLE: 'idle',
  COUNTS_BLOCKED: 'blocked',
} as const

export const SLACK_PEOPLE_MESSAGES = {
  LOAD_ERROR: 'Could not load your Slack people. Try again.',
  REFRESH_ERROR: 'Could not refresh Slack. Try again.',
  REFRESH_SUCCESS: 'Slack people and channels refreshed.',
  MODE_ERROR: 'Could not save that delivery mode.',
  CLASSIFICATION_ERROR: "I couldn't save that person type. Try again.",
  IDENTITY_CONFIRM_ERROR: "I couldn't confirm that match. Refresh and try again.",
  IDENTITY_CONFIRMED: 'Matched. Their portal identity and User Brain are now connected.',
  IDENTITY_MAP_ERROR: "I couldn't map that portal user. Refresh and try again.",
  IDENTITY_MAPPED: 'Portal user mapped. Their available Brain is now connected.',
  BRAIN_CREATE_ERROR: "I couldn't create that Person Brain. Refresh and try again.",
  BRAIN_CREATED: 'Person Brain is on. New knowledge can now compound around this identity.',
  ACTIVITY_ERROR:
    "I couldn't open that Slack conversation. Check the Slack connection and try again.",
  DISCONNECTED: 'Connect Slack to discover teammates and external people.',
  SHADOW_SAFETY:
    'Creating or reviewing a proposal never sends it. Only an approved proposal for an Active person can be sent with Send now.',
  CURRENT_CAPABILITY:
    'Team loops run on a schedule from Loops. Shadow creates reviewable proposals; Active performs only the behavior enabled by an administrator.',
  GHOST_PROFILE_HELP:
    'Internal, External, and Ignored describe your relationship. The portal icon separately shows whether this Slack identity is linked to an actual Vibey user.',
  CHANNELS_NONE: 'No shared Slack channels are visible to this bot.',
  CHANNELS_LOAD_ERROR: "I couldn't load Pixel's Slack channels. Refresh and try again.",
  CHANNEL_ACTIVITY_ERROR: "I couldn't load that Slack channel conversation. Try again.",
  SIGNAL_EVIDENCE_SHOW: 'Show source evidence',
  SIGNAL_EVIDENCE_HIDE: 'Hide source evidence',
  SIGNAL_EVIDENCE_OLDER: 'The source text was not saved with this older signal.',
  SIGNAL_EVIDENCE_OPEN_SLACK: 'Open source message in Slack',
  SIGNAL_TRAIN_SUCCESS: 'Shadow action plan created. Nothing was sent.',
  SIGNAL_TRAIN_ERROR: "Pixel couldn't turn that instruction into an internal action plan.",
  SIGNAL_REVIEW_HELP:
    'Mark reviewed only clears this finding from review. It does not create or send a message. To act on it, tell Pixel who should handle it and create an internal Shadow action plan.',
  CHANNEL_EXCLUSION_SUCCESS: 'Slack channel coverage updated.',
  CHANNEL_EXCLUSION_ERROR: "Pixel couldn't update that channel setting.",
  HOW_IT_WORKS: [
    {
      title: '1. Pick a person',
      body: 'Classify them as Internal, External, or Ignored. Leave delivery in Shadow to preview safely.',
    },
    {
      title: '2. Review the draft',
      body: 'Create test proposal adds a sample message to the Shadow inbox. Approve or dismiss it; neither action sends anything.',
    },
    {
      title: '3. Send when ready',
      body: 'After approval, set delivery to Active and click Send now. Their timeline shows the proposal and delivered Slack message.',
    },
  ],
  EMPTY_ACTIONS:
    'New message and workflow proposals will appear here before anything is delivered.',
  TEST_PROPOSAL_ERROR: "Couldn't create that test proposal. Check the person's mode and try again.",
  TEST_PROPOSAL_CREATED: 'Test proposal added to the Shadow inbox.',
  PROPOSAL_ERROR:
    "Couldn't add that draft to Shadow review. Check the person's mode and try again.",
  PROPOSAL_CREATED: 'Draft added to this Shadow conversation. Nothing was sent.',
  PERSON_NOT_FOUND: 'That Slack person is no longer available. Refresh People and try again.',
  REVIEW_ERROR: "Couldn't save that review. Refresh and try again.",
  REVIEW_APPROVED: 'Approved. Set this person to Active when you are ready to send.',
  REVIEW_DISMISSED: 'Dismissed. Nothing was sent.',
  SEND_ERROR: "Couldn't send that message. Confirm the person is Active and Slack is connected.",
  SEND_SUCCESS: 'Sent through Slack.',
  ACTIVE_REQUIRED: 'Set this person to Active before Send now becomes available.',
  POST_CALL_SHADOW_LABEL: 'Post-call follow-up · Shadow · not sent',
  POST_CALL_SENT_LABEL: 'Post-call follow-up · sent to Slack',
} as const
