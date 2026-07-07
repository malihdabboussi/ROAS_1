export const ARTIFACT_MENU_TOAST_ERRORS = {
  RENAME_FAILED: { userMessage: 'Failed to rename — try again.' },
  DUPLICATE_FAILED: { userMessage: 'Failed to duplicate — try again.' },
  MOVE_FAILED: { userMessage: 'Failed to move — try again.' },
  COPY_FAILED: { userMessage: 'Failed to copy — try again.' },
  DELETE_FAILED: { userMessage: 'Failed to delete — try again.' },
  PUBLISH_FAILED: { userMessage: 'Failed to publish — try again.' },
  UNPUBLISH_FAILED: { userMessage: 'Failed to unpublish — try again.' },
  CONNECT_DOMAIN_FAILED: { userMessage: 'Failed to connect domain — try again.' },
  EXPORT_RESPONSES_FAILED: { userMessage: 'Failed to export responses — try again.' },
  FORM_NO_RESPONSES: { userMessage: 'No responses yet.' },
} as const

export const ARTIFACT_MENU_TOAST_SUCCESS = {
  RENAMED: { userMessage: 'Renamed.' },
  DUPLICATED: { userMessage: 'Duplicated.' },
  MOVED: { userMessage: 'Moved.' },
  COPIED: { userMessage: 'Copied.' },
  DELETED: { userMessage: 'Deleted.' },
  PUBLISHED: { userMessage: 'Published.' },
  UNPUBLISHED: { userMessage: 'Unpublished.' },
  DOMAIN_CONNECTED: { userMessage: 'Custom domain connected.' },
  RESPONSES_EXPORTED: { userMessage: 'Responses exported.' },
} as const
