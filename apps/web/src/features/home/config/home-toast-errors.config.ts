export const HOME_TOAST_ERRORS = {
  MISSION_NOT_FOUND: { userMessage: 'Mission not found.' },
  SEND_MESSAGE_FAILED: { userMessage: 'Could not send message — try again.' },
  CALENDAR_LOAD_FAILED: { userMessage: 'Failed to load calendar — try again.' },
  DUPLICATE_CONVERSATION_FAILED: { userMessage: 'Could not duplicate conversation.' },
} as const

export const HOME_TOAST_SUCCESS = {
  LINK_COPIED: { userMessage: 'Link copied.' },
} as const
