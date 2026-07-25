export const INBOX_MESSAGES = {
  TITLE: 'Inbox',
  SUBTITLE: 'Everything that needs your attention, sorted and ready.',
  LOADING: 'Pulling your inbox together…',
  VIEWS: {
    primary: 'Primary',
    other: 'Other',
    later: 'Later',
    cleared: 'Cleared',
  },
  FILTER: {
    label: 'Filter by type',
    all: 'All types',
  },
  NO_DETAIL: 'No extra detail on this one.',
  EMPTY: {
    primary: 'Primary is clear. You’re all caught up.',
    other: 'Nothing else is waiting.',
    later: 'Nothing is snoozed right now.',
    cleared: 'Cleared items will show up here.',
    all: 'Your inbox is clear.',
  },
  ACTIONS: {
    clear: 'Clear this item',
    restore: 'Bring this back',
    snooze: 'Save this for tomorrow',
    unsnooze: 'Bring this back now',
    read: 'Mark as read',
    unread: 'Mark as unread',
    open: 'Open this item',
    primary: 'Move to Primary',
    other: 'Move to Other',
  },
  ERRORS: {
    load: "I couldn't load your inbox. Give it another shot?",
    update: "That change didn't stick. I put everything back—try once more?",
  },
} as const
