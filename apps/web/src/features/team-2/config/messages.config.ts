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
  MODE_ERROR: 'Could not save that delivery mode.',
  DISCONNECTED: 'Connect Slack to discover teammates and external people.',
  SHADOW_SAFETY:
    'Creating or reviewing a proposal never sends it. Only an approved proposal for an Active person can be sent with Send now.',
  CURRENT_CAPABILITY:
    'This first release lets you test and control the review flow. Automatic proposal discovery is the next layer — nothing is being generated or sent in the background yet.',
  GHOST_PROFILE_HELP:
    'A Ghost profile is a Slack identity that has not matched a platform teammate or known external contact yet.',
  HOW_IT_WORKS: [
    {
      title: '1. Pick a person',
      body: 'Leave them in Shadow to preview safely. Off blocks proposals. Active unlocks manual sending after approval.',
    },
    {
      title: '2. Review the draft',
      body: 'Create test proposal adds a sample message to the Shadow inbox. Approve or dismiss it; neither action sends anything.',
    },
    {
      title: '3. Send when ready',
      body: 'After approval, set that person to Active and click Send now. Active does not send automatically.',
    },
  ],
  EMPTY_ACTIONS:
    'New message and workflow proposals will appear here before anything is delivered.',
  TEST_PROPOSAL_ERROR: "Couldn't create that test proposal. Check the person's mode and try again.",
  TEST_PROPOSAL_CREATED: 'Test proposal added to the Shadow inbox.',
  REVIEW_ERROR: "Couldn't save that review. Refresh and try again.",
  REVIEW_APPROVED: 'Approved. Set this person to Active when you are ready to send.',
  REVIEW_DISMISSED: 'Dismissed. Nothing was sent.',
  SEND_ERROR: "Couldn't send that message. Confirm the person is Active and Slack is connected.",
  SEND_SUCCESS: 'Sent through Slack.',
  ACTIVE_REQUIRED: 'Set this person to Active before Send now becomes available.',
} as const
