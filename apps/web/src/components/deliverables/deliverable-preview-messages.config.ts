export const DELIVERABLE_PREVIEW_MESSAGES = {
  GOOGLE_DOC_CREATED: 'Google Doc created.',
  GOOGLE_DOC_CREATE_FAILED: "I couldn't export this document to Google Docs.",
  GOOGLE_DOC_LINK_SAVE_FAILED: 'The Google Doc was created, but its link was not saved here.',
  GOOGLE_DOC_TABS_CREATED: (tabCount: number) =>
    tabCount === 1 ? 'Google Doc created with 1 tab.' : `Google Doc created with ${tabCount} tabs.`,
  GOOGLE_DOC_TABS_CREATE_FAILED: "I couldn't export these deliverables to Google Docs.",
  GOOGLE_DOC_TABS_NONE: 'No space documents to export yet.',
} as const
