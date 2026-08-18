export const HOME_TOAST_ERRORS = {
  MISSION_NOT_FOUND: { userMessage: 'Mission not found.' },
  SEND_MESSAGE_FAILED: { userMessage: 'Could not send message — try again.' },
  CALENDAR_LOAD_FAILED: { userMessage: 'Failed to load calendar — try again.' },
  AGENDA_MINIMIZE_FAILED: { userMessage: 'Could not hide that meeting — try again.' },
  AGENDA_RESTORE_FAILED: { userMessage: 'Could not restore that meeting — try again.' },
  AGENDA_SETTINGS_LOAD_FAILED: {
    userMessage: 'Could not sync hidden meetings — try refreshing.',
  },
  DUPLICATE_CONVERSATION_FAILED: { userMessage: 'Could not duplicate conversation.' },
  MEETING_WORKSPACE_LOAD_FAILED: { userMessage: 'Could not load the meeting workspace.' },
  MEETING_START_FAILED: { userMessage: 'Could not start the meeting workspace.' },
  MEETING_END_FAILED: { userMessage: 'Could not end the call.' },
  INSTANT_MEETING_CREATE_FAILED: { userMessage: 'Could not start the impromptu call.' },
  MEETING_NOTE_SAVE_FAILED: { userMessage: 'Could not save that meeting note.' },
  MEETING_ACTION_UPDATE_FAILED: { userMessage: 'Could not update that action item.' },
  MEETING_ACTION_CREATE_FAILED: { userMessage: 'Could not add that action item.' },
  MEETING_RECORDINGS_LOAD_FAILED: {
    userMessage: 'Could not load Fathom recordings — check the connection and try again.',
  },
  MEETING_RECORDING_LINK_FAILED: { userMessage: 'Could not link that recording.' },
  MEETING_NOTE_CREATE_FAILED: { userMessage: 'Could not save that note.' },
  MEETING_RENAME_FAILED: { userMessage: 'Could not rename this meeting.' },
  MEETINGS_SPACE_REQUIRED: {
    userMessage: 'Open or create your Meetings space first.',
  },
  MEETINGS_MATERIALIZE_FAILED: {
    userMessage: 'Could not add calendar meetings to All Meetings.',
  },
} as const

export const HOME_TOAST_SUCCESS = {
  LINK_COPIED: { userMessage: 'Link copied.' },
  MEETING_STARTED: { userMessage: 'Meeting workspace is live.' },
  MEETING_ENDED: { userMessage: 'Call ended. Keep dumping notes in chat anytime.' },
  MEETING_ACTION_CREATED: { userMessage: 'Action item locked in.' },
  MEETING_ACTION_ALREADY_EXISTS: {
    userMessage: 'Already on the list — no duplicate added.',
  },
  MEETING_RECORDING_LINKED: { userMessage: 'Recording linked to this meeting.' },
  MEETING_NOTE_ADDED: { userMessage: 'Note saved to this meeting.' },
  MEETING_RENAMED: { userMessage: 'Meeting renamed everywhere.' },
} as const
