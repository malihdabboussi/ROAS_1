export const HOME_TOAST_ERRORS = {
  MISSION_NOT_FOUND: { userMessage: 'Mission not found.' },
  SEND_MESSAGE_FAILED: { userMessage: 'Could not send message — try again.' },
  CALENDAR_LOAD_FAILED: { userMessage: 'Failed to load calendar — try again.' },
  DUPLICATE_CONVERSATION_FAILED: { userMessage: 'Could not duplicate conversation.' },
  PREP_START_FAILED: { userMessage: 'Could not start pre-call prep.' },
  MEETING_WORKSPACE_LOAD_FAILED: { userMessage: 'Could not load the meeting workspace.' },
  MEETING_START_FAILED: { userMessage: 'Could not start the meeting workspace.' },
  MEETING_NOTE_SAVE_FAILED: { userMessage: 'Could not save that meeting note.' },
  MEETING_ACTION_UPDATE_FAILED: { userMessage: 'Could not update that action item.' },
  MEETINGS_SPACE_REQUIRED: {
    userMessage: 'Open or create your Meetings space first, then try prep again.',
  },
} as const

export const HOME_TOAST_SUCCESS = {
  LINK_COPIED: { userMessage: 'Link copied.' },
  PREP_STARTED: { userMessage: 'Pre-call prep started.' },
  MEETING_STARTED: { userMessage: 'Meeting workspace is live.' },
} as const
