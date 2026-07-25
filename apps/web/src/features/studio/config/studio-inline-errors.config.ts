/** User-facing fallback messages for inline errors (setError, setRefreshError, etc.) */
export const STUDIO_INLINE_ERRORS = {
  LOAD_PRESENTATION: "Couldn't load presentation.",
  LOAD_PREVIEW: "Couldn't load preview.",
  LOAD_PAGE: "Couldn't load page content.",
  LOAD_AD: "Couldn't load ad.",
  LOAD_ARTIFACTS: "Couldn't load artifacts.",
  LOAD_SEQUENCE: "Couldn't load sequence.",
  LOAD_AVATAR: "Couldn't load avatar.",
  LOAD_OFFER: "Couldn't load offer.",
  LOAD_DOCUMENTS: "Couldn't load documents.",
  LOAD_MEDIA: "Couldn't load media.",
  LOAD_GENERIC: "Couldn't load.",
  LOAD_WORKFLOW: "Couldn't load workflow.",
  REFRESH_META_STATUS: "Couldn't refresh Meta status.",
  UPDATE_META_STATUS: "Couldn't update Meta status.",
  LOAD_ESTIMATE: "Couldn't load estimate.",
  PUBLISH_FAILED: 'Publish failed.',
  DELETE_ARTIFACT: "Couldn't delete. Try again.",
  IMPORT_CONTACTS: "Couldn't import contacts.",
  IMAGE_GENERATION: 'Generation failed.',
  PREVIEW_URL_FAILED: "Couldn't generate preview URL.",
  CREATE_ARTIFACT: "Couldn't create. Try again.",
  REORDER_PAGES: "Couldn't reorder pages. Try again.",
  REORDER_EMAILS: "Couldn't reorder emails. Try again.",
  MOVE_PAGE: "Couldn't move page. Try again.",
  MOVE_EMAIL: "Couldn't move email. Try again.",
  UPDATE_ARTIFACT: "Couldn't update. Try again.",
  MOVE_TO_CAMPAIGN: "Couldn't move. Try again.",
  DUPLICATE_ARTIFACT: "Couldn't duplicate. Try again.",
  PUBLISH_FUNNEL: "Couldn't publish funnel. Try again.",
  UNPUBLISH_FUNNEL: "Couldn't unpublish funnel. Try again.",
  FUNNEL_UNDO: "Couldn't undo funnel change. Try again.",
  FUNNEL_REDO: "Couldn't redo funnel change. Try again.",
  FUNNEL_HISTORY_LOAD: "Couldn't load saved versions. Try again.",
  FUNNEL_HISTORY_RESTORE: "Couldn't restore that version. Try again.",
  FUNNEL_HISTORY_BOOKMARK: "Couldn't bookmark that version. Try again.",
  PUBLISH_PRESENTATION: "Couldn't publish presentation. Try again.",
  UNPUBLISH_PRESENTATION: "Couldn't unpublish presentation. Try again.",
  SAVE_EMAIL: "Couldn't save email. Try again.",
  COPY_FAILED: "Couldn't copy. Try again.",
  DOWNLOAD_FAILED: "Couldn't download. Try again.",
  SAVE_SETTINGS: "Couldn't save. Try again.",
  LOAD_ANALYTICS: "Couldn't load analytics.",
  LOAD_META_INSIGHTS: "Couldn't load Meta insights.",
  SAVE_BUDGET: "Couldn't save budget. Try again.",
  UPDATE_STATUS: "Couldn't update status. Try again.",
  META_CONNECTION_CHECK: "Couldn't check Meta connection.",
  LOAD_AD_ACCOUNTS: "Couldn't load ad accounts.",
  LOAD_FB_PAGES: "Couldn't load Facebook pages.",
  LOAD_IG_ACCOUNTS: "Couldn't load Instagram accounts.",
  LOAD_AD_CREATIVE: "Couldn't load ad.",
  LOAD_CAMPAIGN_DATA: "Couldn't load campaign data.",
  LOAD_CONVERSATIONS_FAILED: "Couldn't load conversations. Try again.",
  RESTORE_CAMPAIGN_FAILED: "Couldn't restore campaign. Try again.",
  // Meta publish validation
  META_PUBLISH_MISSING_ID: 'Missing ad or campaign id for Meta publish',
  META_PUBLISH_CONNECT_META: 'Connect Meta in Settings > Integrations',
  META_PUBLISH_SKIPPED: 'Skipped',
  META_PUBLISH_NO_AD_ACCOUNTS: 'No ad accounts found',
  META_PUBLISH_NO_FB_PAGES: 'No Facebook pages found',
  META_PUBLISH_SELECT_PAGE_FIRST: 'Select a Facebook page first',
  META_PUBLISH_NO_IG_ACCOUNT: 'No Instagram account connected to this Facebook page',
  META_PUBLISH_CAMPAIGN_NEEDS_ADS: 'Campaign must include ad sets and ads',
  META_PUBLISH_AD_NEEDS_IMAGE: 'Ad needs an image',
  META_PUBLISH_MISSING_HEADLINE_TEXT: 'Missing headline or primary text',
  META_PUBLISH_ALL_ADS_NEED_URL: 'All ads must include destination URL',
  META_PUBLISH_DESTINATION_REQUIRED: 'Destination URL is required',
  META_PUBLISH_OBJECTIVE_NOT_SET: 'Campaign objective not set',
  META_PUBLISH_SET_CAMPAIGN_BUDGET_BEFORE: 'Set campaign budget before publishing',
  META_PUBLISH_SET_CAMPAIGN_BUDGET: 'Set a budget on the campaign',
  META_PUBLISH_SET_ADSET_BUDGET: 'Set a budget on the ad set',
  META_PUBLISH_NEED_TARGETING: 'All ad sets need targeting before publishing',
  META_PUBLISH_ADD_TARGET_COUNTRY: 'Add at least one target country',
  META_PUBLISH_AD_NOT_LINKED: 'Ad is not linked to an ad set',
  META_PUBLISH_PREVALIDATION_FAILED: 'Campaign pre-validation failed',
  META_PUBLISH_AD_NEEDS_IMAGE_TO_PUBLISH: 'Ad must have an image to publish to Meta',
  META_PUBLISH_EXPORT_PNG_FAILED: 'Failed to export TSX ad as PNG',
  META_PUBLISH_UPLOAD_PNG_FAILED: 'Failed to upload exported PNG',
  META_PUBLISH_NO_IG_SELECTED: 'No Instagram account connected to the selected Facebook page',
  META_PUBLISH_NO_RESPONSE: 'No response',
  // Social post schedule
  SCHEDULE_PAST_DATE: "Can't schedule in the past — pick a future date and time.",
  SCHEDULE_INVALID_DATE: 'That date is invalid — try again.',
  SCHEDULE_FAILED: "Couldn't schedule post. Try again.",
  UNSCHEDULE_FAILED: "Couldn't unschedule post. Try again.",
  SCHEDULE_POST_NOT_FOUND: 'Post not found — it may have been deleted.',
  // Social post actions
  SCHEDULE_CAPTION_UPDATE_FAILED: "Couldn't update caption. Try again.",
  SCHEDULE_MARK_READY_FAILED: "Couldn't mark post as ready. Try again.",
  // Media tab
  DELETE_MEDIA_FAILED: "Couldn't delete media. Try again.",
  RENAME_MEDIA_FAILED: "Couldn't rename media. Try again.",
  DELETE_DOCUMENT_FAILED: "Couldn't delete document. Try again.",
  RENAME_DOCUMENT_FAILED: "Couldn't rename document. Try again.",
  UPLOAD_MEDIA_FAILED: "Couldn't upload. Try again.",
  // Themes
  SAVE_THEME_FAILED: "Couldn't save theme. Try again.",
  LOAD_THEMES_FAILED: "Couldn't load themes.",
  LOAD_THEME_FAILED: "Couldn't load theme.",
  CREATE_THEME_FAILED: "Couldn't create theme. Try again.",
} as const

/** Backend error pattern → config key. First match wins. */
export const STUDIO_BACKEND_ERROR_MAP: Array<{
  pattern: string | RegExp
  key: keyof typeof STUDIO_INLINE_ERRORS
}> = [
  { pattern: 'must be in the future', key: 'SCHEDULE_PAST_DATE' },
  { pattern: 'is invalid', key: 'SCHEDULE_INVALID_DATE' },
  { pattern: 'not found', key: 'SCHEDULE_POST_NOT_FOUND' },
]

export function resolveBackendErrorMessage(
  error: unknown,
  fallbackKey: keyof typeof STUDIO_INLINE_ERRORS,
): string {
  const msg = error instanceof Error ? error.message : String(error)
  for (const { pattern, key } of STUDIO_BACKEND_ERROR_MAP) {
    const matches =
      typeof pattern === 'string' ? msg.includes(pattern) : (pattern as RegExp).test(msg)
    if (matches) return STUDIO_INLINE_ERRORS[key]
  }
  return STUDIO_INLINE_ERRORS[fallbackKey]
}

/** Meta publish modal validation step messages (rotating during validation) */
export const META_PUBLISH_VALIDATION_MESSAGES = [
  'Connecting to Meta...',
  'Verifying your ad accounts...',
  'Checking Facebook pages...',
  'Validating campaign setup...',
  'Reviewing ad creative...',
  'Almost there...',
] as const
