/** User-facing toast messages for media library (Drive, Dropbox, MediaPicker) */
export const MEDIA_TOAST_ERRORS = {
  FILE_TYPE_UNSUPPORTED: {
    userMessage: 'Only images, videos, and documents can be added to library.',
  },
  ADD_TO_LIBRARY_FAILED: {
    userMessage: "Couldn't add to library. Try again.",
  },
  IMPORT_FAILED: {
    userMessage: "Couldn't import. Try again.",
  },
  DELETE_FAILED: {
    userMessage: "Couldn't delete. Try again.",
  },
  UPLOAD_FAILED: {
    userMessage: "Couldn't upload. Try again.",
  },
  SHARE_FAILED: {
    userMessage: "Couldn't share. Try again.",
  },
  RENAME_FAILED: {
    userMessage: "Couldn't rename. Try again.",
  },
  DOWNLOAD_FAILED: {
    userMessage: "Couldn't download. Try again.",
  },
  CREATE_LINK_FAILED: {
    userMessage: "Couldn't create shared link. Try again.",
  },
  DRIVE_STATUS_CHECK_FAILED: {
    userMessage: "Couldn't check Google Drive status. Try again.",
  },
  DROPBOX_STATUS_CHECK_FAILED: {
    userMessage: "Couldn't check Dropbox status. Try again.",
  },
  DRIVE_LOAD_FAILED: {
    userMessage: 'Failed to load Google Drive files.',
  },
  CLOUD_DRIVE_CONNECT_FIRST: {
    userMessage: 'Connect Google Drive first.',
  },
  CLOUD_DROPBOX_CONNECT_FIRST: {
    userMessage: 'Connect Dropbox first.',
  },
} as const

/** User-facing toast messages for media success */
export const MEDIA_TOAST_SUCCESS = {
  IMPORTED: {
    userMessage: 'Imported to media library.',
  },
  DELETED: {
    userMessage: 'Deleted.',
  },
  UPLOADED: {
    userMessage: 'Uploaded.',
  },
  RENAMED: {
    userMessage: 'File renamed.',
  },
  SHARED: {
    userMessage: 'Shared.',
  },
  LINK_COPIED: {
    userMessage: 'Link copied to clipboard.',
  },
} as const
