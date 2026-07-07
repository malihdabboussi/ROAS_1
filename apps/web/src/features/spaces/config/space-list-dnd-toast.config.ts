/**
 * Toasts for space list drag-and-drop when `buildSpaceListReorder` returns `ok: false`.
 * Add keys here; map `reason` strings from `space-list-dnd-apply` → key below.
 */

export const SPACES_LIST_DND_TOAST_ERRORS = {
  GENERIC: {
    userMessage: "Couldn't move that. Try a different drop target.",
  },
  SAME: {
    userMessage: 'Drop on another row to move this task.',
  },
  NOT_FOUND: {
    userMessage: "Couldn't find that task. Refresh and try again.",
  },
  INTO_SUBTASK: {
    userMessage: 'Drop into a top-level task only. Subtasks can’t be containers.',
  },
  INTO_HAS_CHILDREN: {
    userMessage:
      'Move or remove subtasks first — a task with subtasks can’t be dropped inside another.',
  },
  INTO_DESCENDANT: {
    userMessage: 'You can’t put a task inside its own subtasks.',
  },
  ALREADY_CHILD: {
    userMessage: 'That task is already in this subtask list.',
  },
  BEFORE_AFTER_UNDER_SELF: {
    userMessage: 'You can’t put a task under itself in the list.',
  },
  BEFORE_AFTER_NESTED_SUBTASK: {
    userMessage: 'Tasks can only be nested one level. Drop next to a main task instead.',
  },
  OVER_NOT_IN_LIST: {
    userMessage: "Couldn't place the task there. Try again.",
  },
} as const

/** `reason` values emitted by `buildSpaceListReorder` in `space-list-dnd-apply.ts` */
const REASON_TO_KEY = {
  same: 'SAME',
  'not-found': 'NOT_FOUND',
  'into-subtask': 'INTO_SUBTASK',
  'into-has-children': 'INTO_HAS_CHILDREN',
  'into-descendant': 'INTO_DESCENDANT',
  'already-child': 'ALREADY_CHILD',
  'before-after-under-self': 'BEFORE_AFTER_UNDER_SELF',
  'before-after-nested-subtask': 'BEFORE_AFTER_NESTED_SUBTASK',
  'over-not-in-list': 'OVER_NOT_IN_LIST',
} as const satisfies Record<string, keyof typeof SPACES_LIST_DND_TOAST_ERRORS>

type KnownReason = keyof typeof REASON_TO_KEY

function isKnownReason(r: string): r is KnownReason {
  return r in REASON_TO_KEY
}

export function getSpaceListDndInvalidToastMessage(reason: string): string {
  if (isKnownReason(reason)) {
    const key = REASON_TO_KEY[reason]
    return SPACES_LIST_DND_TOAST_ERRORS[key].userMessage
  }
  return SPACES_LIST_DND_TOAST_ERRORS.GENERIC.userMessage
}
