/** User-facing toast messages for Brain feature errors */
export const BRAIN_TOAST_ERRORS = {
  TITLE_CONTENT_REQUIRED: {
    userMessage: 'Title and content are required.',
  },
  URL_REQUIRED: {
    userMessage: 'URL is required.',
  },
  IMPORT_FAILED: {
    userMessage: "Couldn't import. Try again.",
  },
  ADD_TEXT_FAILED: {
    userMessage: "Couldn't add text. Try again.",
  },
  IMPORT_LINK_FAILED: {
    userMessage: "Couldn't import link. Try again.",
  },
  LINK_INGESTION_FAILED: {
    userMessage: "Couldn't ingest link. Try again.",
  },
  INGESTION_FAILED: {
    userMessage: 'Ingestion failed. Try again.',
  },
  NO_BRAIN_SELECTED: {
    userMessage: 'Select a brain first.',
  },
  FILE_TYPE_UNSUPPORTED: {
    userMessage: 'File type not supported for this upload action.',
  },
  CAMPAIGN_MEDIA_TYPE_UNSUPPORTED: {
    userMessage: 'Campaign file upload currently supports text, document, and image files only.',
  },
  AUDIO_FORMAT_UNSUPPORTED: {
    userMessage: 'Audio format not supported. Use MP3 or WAV.',
  },
  VIDEO_FORMAT_UNSUPPORTED: {
    userMessage: 'Video format not supported. Use MP4 or MOV.',
  },
  AUDIO_DURATION_UNREADABLE: {
    userMessage: "Couldn't read audio duration. Try a different file.",
  },
  VIDEO_DURATION_UNREADABLE: {
    userMessage: "Couldn't read video duration. Try a different file.",
  },
  AUDIO_DURATION_EXCEEDED: {
    userMessage: 'Audio is too long. Maximum supported length is 80 seconds.',
  },
  VIDEO_DURATION_EXCEEDED: {
    userMessage: 'Video is too long. Maximum supported length is 120 seconds.',
  },
  LINK_TYPE_UNSUPPORTED: {
    userMessage:
      "This content type isn't supported yet. Try pasting the text directly, uploading a PDF, or linking to a web article.",
  },
  EXTRACT_TEXT_FAILED: {
    userMessage: "Couldn't extract text from document. Try again.",
  },
  DOCUMENT_EMPTY: {
    userMessage: 'Document has no extractable text.',
  },
  FILE_EMPTY: {
    userMessage: 'File is empty.',
  },
  CAMPAIGN_REQUIRED: {
    userMessage: 'Select a campaign first.',
  },
  LOAD_FATHOM_FAILED: {
    userMessage: "Couldn't load Fathom calls. Try again.",
  },
  LOAD_FIREFLIES_FAILED: {
    userMessage: "Couldn't load Fireflies calls. Try again.",
  },
  IMPORT_FATHOM_FAILED: {
    userMessage: "Couldn't import Fathom call. Try again.",
  },
  IMPORT_FIREFLIES_FAILED: {
    userMessage: "Couldn't import Fireflies call. Try again.",
  },
  ACTIVATE_FAILED: {
    userMessage: "Couldn't activate Agent Brain. Try again.",
  },
  PAGE_GRADER_RESYNC_FAILED: {
    userMessage: "Couldn't re-sync from Page Grader. Try again.",
  },
} as const

/** User-facing toast messages for Brain success */
export const BRAIN_TOAST_SUCCESS = {
  IMPORTED: {
    userMessage: 'Imported.',
  },
  TEXT_ADDED: {
    userMessage: 'Text added.',
  },
  LINK_IMPORTED: {
    userMessage: 'Link imported.',
  },
  ACTIVATED: {
    userMessage: 'Agent Brain activated.',
  },
  PAGE_GRADER_RESYNCED: {
    userMessage: 'Re-synced from Page Grader.',
  },
} as const
