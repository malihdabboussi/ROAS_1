/** Toasts when `buildDocsTreeReorder` returns `ok: false`. */

export const DOCS_TREE_DND_TOAST_ERRORS = {
  GENERIC: {
    userMessage: "Couldn't move that page. Try another spot.",
  },
  SAME: {
    userMessage: 'Drop on another page to move this one.',
  },
  NOT_FOUND: {
    userMessage: "Couldn't find that page. Refresh and try again.",
  },
  INTO_DESCENDANT: {
    userMessage: "You can't nest a page inside itself.",
  },
  ALREADY_CHILD: {
    userMessage: 'That page is already nested here.',
  },
  BEFORE_AFTER_UNDER_SELF: {
    userMessage: "You can't place a page under itself.",
  },
  OVER_NOT_IN_LIST: {
    userMessage: "Couldn't place the page there. Try again.",
  },
  MAX_DEPTH: {
    userMessage: 'Doc pages can’t be nested more than 5 levels deep.',
  },
} as const

const REASON_TO_KEY = {
  same: 'SAME',
  'not-found': 'NOT_FOUND',
  'into-descendant': 'INTO_DESCENDANT',
  'already-child': 'ALREADY_CHILD',
  'before-after-under-self': 'BEFORE_AFTER_UNDER_SELF',
  'over-not-in-list': 'OVER_NOT_IN_LIST',
  'max-depth': 'MAX_DEPTH',
} as const satisfies Record<string, keyof typeof DOCS_TREE_DND_TOAST_ERRORS>

type KnownReason = keyof typeof REASON_TO_KEY

function isKnownReason(r: string): r is KnownReason {
  return r in REASON_TO_KEY
}

export function getDocsTreeDndInvalidToastMessage(reason: string): string {
  if (isKnownReason(reason)) {
    const key = REASON_TO_KEY[reason]
    return DOCS_TREE_DND_TOAST_ERRORS[key].userMessage
  }
  return DOCS_TREE_DND_TOAST_ERRORS.GENERIC.userMessage
}
