export const WORK_REQUEST_ERRORS = {
  LOAD_FAILED: {
    code: 'WORK_REQUEST_LOAD_FAILED',
    userMessage: "I couldn't open this Service Request. Try the link again.",
    logMessage: 'Public Service Request review load failed',
    severity: 'error',
    retryable: true,
    logToAdmin: false,
    httpStatus: 500,
  },
  SAVE_FAILED: {
    code: 'WORK_REQUEST_SAVE_FAILED',
    userMessage: "I couldn't save those changes yet. Give it another try.",
    logMessage: 'Public Service Request review save failed',
    severity: 'error',
    retryable: true,
    logToAdmin: false,
    httpStatus: 400,
  },
  FINALIZE_FAILED: {
    code: 'WORK_REQUEST_FINALIZE_FAILED',
    userMessage: "I couldn't submit this yet. Check the missing context and try again.",
    logMessage: 'Public Service Request finalization failed',
    severity: 'error',
    retryable: true,
    logToAdmin: false,
    httpStatus: 400,
  },
} as const
