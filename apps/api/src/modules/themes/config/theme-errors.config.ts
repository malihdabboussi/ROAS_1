/**
 * Theme Feature - Error Configuration
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/config/theme-errors.config.ts
 */

export const THEME_ERRORS = {
  SAVE_FAILED: {
    code: 'SAVE_FAILED',
    userMessage: "Couldn't save this theme. Mind giving it another shot?",
  },
  DELETE_FAILED: {
    code: 'DELETE_FAILED',
    userMessage: "Couldn't delete that theme. Let's try again.",
  },
  UPDATE_FAILED: { code: 'UPDATE_FAILED', userMessage: "Couldn't update that. Want to try again?" },
  THEME_NOT_FOUND: {
    code: 'THEME_NOT_FOUND',
    userMessage: "Can't find that theme. Might have been deleted already.",
  },
  THEME_SYSTEM_IMMUTABLE: {
    code: 'THEME_SYSTEM_IMMUTABLE',
    userMessage: "That's a system theme - you can't edit or delete it, but you can duplicate it!",
  },
  THEME_LIMIT_REACHED: {
    code: 'THEME_LIMIT_REACHED',
    userMessage: "You've hit your custom theme limit. Delete one or upgrade to create more.",
  },
  URL_REQUIRED: {
    code: 'URL_REQUIRED',
    userMessage: 'Please enter a website URL.',
    httpStatus: 400,
  },
  URL_INVALID: {
    code: 'URL_INVALID',
    userMessage: "That URL doesn't look quite right. Try something like https://stripe.com",
    httpStatus: 400,
  },
  URL_CONNECTION_FAILED: {
    code: 'URL_CONNECTION_FAILED',
    userMessage: "Couldn't reach that website. Check the URL and try again.",
    httpStatus: 422,
  },
  EXTRACTION_NO_DATA: {
    code: 'EXTRACTION_NO_DATA',
    userMessage:
      "Couldn't extract branding from that site. Try a different page or upload a screenshot instead.",
    httpStatus: 422,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    userMessage: 'Something went wrong. Please try again.',
    httpStatus: 500,
  },
} as const
