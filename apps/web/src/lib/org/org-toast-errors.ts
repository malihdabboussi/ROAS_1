export const ORG_TOAST_ERRORS = {
  CREATE_FAILED: { userMessage: 'Could not create workspace — try again.' },
  LOAD_SHARES_FAILED: { userMessage: 'Failed to load sharing data — try again.' },
  UPDATE_PERMISSION_FAILED: { userMessage: "Couldn't update permission — try again." },
  SEND_INVITATION_FAILED: { userMessage: "Couldn't send invitation — try again." },
} as const

export const ORG_TOAST_SUCCESS = {
  ORG_CREATED: { userMessage: 'Workspace created.' },
  INVITATION_SENT: { userMessage: 'Invitation sent.' },
} as const
