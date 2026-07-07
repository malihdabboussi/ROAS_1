/** User-facing toast messages for ads/media errors */
export const ADS_TOAST_ERRORS = {
  MEDIA_TYPE_UNSUPPORTED: {
    userMessage: 'Only images and videos are supported.',
  },
  MEDIA_UPLOAD_FAILED: {
    userMessage: "Couldn't upload media. Try again.",
  },
  SAVE_FAILED: {
    userMessage: "Couldn't save. Try again.",
  },
  MEDIA_PICK_FAILED: {
    userMessage: "Couldn't save selected media. Try again.",
  },
  MEDIA_REMOVE_FAILED: {
    userMessage: "Couldn't remove media. Try again.",
  },
  COUNTRY_SEARCH_FAILED: {
    userMessage: "Couldn't search countries. Try again.",
  },
  PIXEL_CREATE_FAILED: {
    userMessage: "Couldn't create pixel. Try again.",
  },
  PIXEL_ALREADY_EXISTS: {
    userMessage: 'A pixel already exists for this ad account.',
  },
  PIXEL_MULTIPLE_EXIST: {
    userMessage: 'Multiple pixels already exist for this ad account.',
  },
  PIXEL_PERMISSION_DENIED: {
    userMessage: "You don't have permission to create a pixel for this account.",
  },
  PIXEL_INVALID_NAME: {
    userMessage: 'Invalid pixel name. Please try a different name.',
  },
} as const
