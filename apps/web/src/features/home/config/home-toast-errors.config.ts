export const HOME_TOAST_ERRORS = {
  MISSION_NOT_FOUND: { userMessage: 'Mission not found.' },
  SEND_MESSAGE_FAILED: { userMessage: 'Could not send message — try again.' },
  CALENDAR_LOAD_FAILED: { userMessage: 'Failed to load calendar — try again.' },
  DUPLICATE_CONVERSATION_FAILED: { userMessage: 'Could not duplicate conversation.' },
  PREP_START_FAILED: { userMessage: 'Could not start pre-call prep.' },
  MEETINGS_SPACE_REQUIRED: {
    userMessage: 'Open or create your Meetings space first, then try prep again.',
  },
} as const

export const HOME_TOAST_SUCCESS = {
  LINK_COPIED: { userMessage: 'Link copied.' },
  PREP_STARTED: { userMessage: 'Pre-call prep started.' },
} as const
