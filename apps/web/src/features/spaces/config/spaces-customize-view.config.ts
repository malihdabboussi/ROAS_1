/**
 * User-facing copy for the Customize view panel (labels + toasts).
 * Use these instead of inline strings in components.
 */

export const SPACES_CUSTOMIZE_VIEW_LABELS = {
  AUTOSAVE_FOR_ME: 'Autosave for me',
  PIN_VIEW: 'Pin view',
  SAVE_FOR_EVERYONE: 'Save for everyone',
  RESET_TO_DEFAULT: 'Reset to default',
  SHARING_PERMISSIONS: 'Sharing & permissions',
  DELETE_VIEW: 'Delete view',
  MODAL_DELETE_BODY: 'This cannot be undone.',
  MODAL_CANCEL: 'Cancel',
  MODAL_DELETE_CONFIRM: 'Delete',
  A11Y_CLOSE: 'Close',
  SAVE_VIEW: 'Save view',
  ENABLE_AUTOSAVE: 'Enable Autosave',
  SAVE_AS_NEW_VIEW: 'Save as new view',
  REVERT_CHANGES: 'Revert changes',
} as const

export function spaceCustomizeDeleteModalTitle(viewName: string): string {
  return `Delete "${viewName}"?`
}

export const SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS = {
  VIEW_SAVED: { userMessage: 'View saved' },
  VIEW_PINNED: { userMessage: 'View pinned' },
  VIEW_UNPINNED: { userMessage: 'View unpinned' },
  SAVE_FOR_EVERYONE: { userMessage: 'View saved for everyone' },
  RESET_TO_DEFAULT: { userMessage: 'View reset to default' },
  VIEW_REVERTED: { userMessage: 'Changes reverted' },
  VIEW_SAVED_AS_NEW: { userMessage: 'Saved as new view' },
} as const

export const SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS = {
  VIEW_SAVE_FAILED: { userMessage: "Couldn't save view. Try again." },
  PIN_FAILED: { userMessage: "Couldn't update pin. Try again." },
  SAVE_FOR_EVERYONE_FAILED: { userMessage: "Couldn't save for everyone. Try again." },
  RESET_FAILED: { userMessage: "Couldn't reset view. Try again." },
  SAVE_AS_NEW_VIEW_FAILED: { userMessage: "Couldn't save as new view. Try again." },
} as const
