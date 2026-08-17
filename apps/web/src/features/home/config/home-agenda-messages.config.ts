export const HOME_AGENDA_MESSAGES = {
  LOADING_MEETINGS: {
    key: 'LOADING_MEETINGS',
    message: 'Loading meetings...',
    category: 'loading',
  },
  INSTANT_MEETING_TITLE: {
    key: 'INSTANT_MEETING_TITLE',
    message: 'START AN IMPROMPTU CALL',
    category: 'title',
  },
  INSTANT_MEETING_DESCRIPTION: {
    key: 'INSTANT_MEETING_DESCRIPTION',
    message:
      'Open a meeting workspace now. If Fathom records the call, its transcript and actions will attach here afterward.',
    category: 'description',
  },
  INSTANT_MEETING_NAME_LABEL: {
    key: 'INSTANT_MEETING_NAME_LABEL',
    message: 'Call name',
    category: 'label',
  },
  INSTANT_MEETING_ATTENDEES_LABEL: {
    key: 'INSTANT_MEETING_ATTENDEES_LABEL',
    message: 'Participant emails (optional)',
    category: 'label',
  },
  INSTANT_MEETING_ATTENDEES_HELP: {
    key: 'INSTANT_MEETING_ATTENDEES_HELP',
    message: 'Participant emails help Fathom match the recording to this workspace.',
    category: 'help',
  },
  INSTANT_MEETING_START: {
    key: 'INSTANT_MEETING_START',
    message: 'Start workspace',
    category: 'button',
  },
  AGENDA_EMPTY: {
    key: 'AGENDA_EMPTY',
    message: 'No agenda notes yet — kick one off with Start agenda above.',
    category: 'empty',
  },
} as const
