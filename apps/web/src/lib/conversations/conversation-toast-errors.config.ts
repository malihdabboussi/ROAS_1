export const CONVERSATION_ACTIONS_TOAST_ERRORS = {
  RENAME_CONVERSATION_FAILED: { userMessage: 'Could not rename conversation.' },
  PIN_CONVERSATION_FAILED: { userMessage: 'Could not pin conversation.' },
  UNPIN_CONVERSATION_FAILED: { userMessage: 'Could not unpin conversation.' },
  MOVE_CONVERSATION_FAILED: { userMessage: 'Could not move conversation.' },
  ADD_CONNECTION_FAILED: { userMessage: 'Could not add that connection.' },
  REMOVE_CONNECTION_FAILED: { userMessage: 'Could not remove that connection.' },
  COPY_FAILED: { userMessage: 'Failed to copy — try again.' },
} as const

export const CONVERSATION_ACTIONS_TOAST_SUCCESS = {
  MOVED_TO_CAMPAIGN: { userMessage: 'Moved to campaign.' },
} as const
