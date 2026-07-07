/** User-facing toast messages for workflow/connection errors */
export const WORKFLOW_TOAST_ERRORS = {
  MISSING_SENDER_IDENTITY: {
    userMessage:
      "Connection created, but it won't send yet: add a verified sender identity in Workspace Settings > Email.",
  },
  NO_CONVERSION_POINTS: {
    userMessage:
      "This won't work: this funnel has no opt-in form (no converting pages). Add an email capture form, then reconnect.",
  },
  FUNNEL_OR_SEQUENCE_NOT_FOUND: {
    userMessage:
      "This connection can't be created because the funnel or sequence no longer exists.",
  },
  SELF_LOOP: {
    userMessage: "This won't work: a sequence can't connect to itself.",
  },
  CYCLE_DETECTED: {
    userMessage: "This won't work: that creates a loop between sequences.",
  },
  SEQUENCE_NOT_FOUND: {
    userMessage: "This connection can't be created because one of the sequences no longer exists.",
  },
  FUNNEL_OR_PRESENTATION_NOT_FOUND: {
    userMessage:
      "This connection can't be created because the funnel or presentation no longer exists.",
  },
  CREATE_CONNECTION_FAILED: {
    userMessage: "Couldn't create connection. Try again.",
  },
  LOAD_SEQUENCE_EMAILS_FAILED: {
    userMessage: "Couldn't load sequence emails.",
  },
  DELETE_CONNECTION_FAILED: {
    userMessage: "Couldn't delete connection. Try again.",
  },
  SAVE_LAYOUT_FAILED: {
    userMessage: "Couldn't save layout. Try again.",
  },
} as const

/** Success messages */
export const WORKFLOW_TOAST_SUCCESS = {
  FUNNEL_TO_SEQUENCE: {
    userMessage:
      "Connected. When someone opts in on this funnel, they'll be sent into this sequence.",
  },
  SEQUENCE_TO_SEQUENCE: {
    userMessage:
      'Connected. When the first sequence finishes, leads will move to the next sequence.',
  },
  FUNNEL_TO_PRESENTATION: {
    userMessage:
      "Connected. When someone opts in on this funnel, they'll receive this presentation.",
  },
} as const
