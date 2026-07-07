export const THEME_ERRORS = {
  URL_REQUIRED: {
    userMessage: "I need a website URL to work with. Drop one in and we're good to go.",
  },
  URL_INVALID: {
    userMessage: "That URL doesn't look quite right. Try something like https://stripe.com",
  },
  FILE_TYPE_INVALID: {
    userMessage: "I need a PDF, image, or doc file. That format won't work.",
  },
  INTERNAL_ERROR: {
    userMessage: "Something got tangled up on my end. Let's try again.",
  },
  UPLOAD_FAILED: {
    userMessage: "Couldn't upload. Try again.",
  },
  LOAD_THEME_USAGE_FAILED: {
    userMessage: "Couldn't load theme usage. Try again.",
  },
} as const

/** User-facing toast messages for theme success */
export const THEME_TOAST_SUCCESS = {
  COLORS_SHUFFLED: {
    userMessage: 'Colors shuffled!',
  },
} as const
