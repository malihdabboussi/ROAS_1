/** User-facing toast messages for mission create errors. */
export const MISSION_CONTROL_TOAST_ERRORS = {
  RETRY_FAILED: { userMessage: "Couldn't retry. Try again." },
  TRASH_FAILED: { userMessage: "Couldn't remove. Try again." },
  LOAD_FAILED: { userMessage: "Couldn't load mission control. Try refreshing." },
  PORTRAIT_GENERATION_FAILED: { userMessage: "Couldn't generate portrait. Try again." },
  ONBOARD_FAILED: { userMessage: "Couldn't complete setup. Try again." },
  CREATE_FAILED: { userMessage: "Couldn't create mission. Try again." },
  CREATE_NO_CREDITS: {
    userMessage: 'You have run out of credits. Purchase more credits to send missions.',
  },
  CREATE_CREDIT_LIMIT: {
    userMessage:
      'Your credit limit has been reached. Contact your org admin or wait for the next period.',
  },
  CREATE_VALIDATION_FAILED: {
    userMessage: "That mission couldn't be sent. Check the text and campaign, then try again.",
  },
  CREATE_SESSION_EXPIRED: {
    userMessage: 'Sign in again, then try creating the mission.',
  },
  CREATE_FORBIDDEN: {
    userMessage: "You don't have permission to create this mission.",
  },
  CREATE_ATTACHMENT_SIGN_IN: {
    userMessage: 'Sign in to attach files to a mission.',
  },
  CREATE_ATTACHMENT_UPLOAD_FAILED: {
    userMessage: "Couldn't upload attachment(s). Try again or remove the files.",
  },
} as const

/** Backend / client error pattern to toast config key. First match wins. */
export const MISSION_CREATE_BACKEND_ERROR_MAP: Array<{
  pattern: string | RegExp
  key: keyof typeof MISSION_CONTROL_TOAST_ERRORS
}> = [
  { pattern: 'run out of credits', key: 'CREATE_NO_CREDITS' },
  { pattern: 'credits_exhausted', key: 'CREATE_NO_CREDITS' },
  { pattern: 'credit limit', key: 'CREATE_CREDIT_LIMIT' },
  { pattern: 'credit_limit_reached', key: 'CREATE_CREDIT_LIMIT' },
  { pattern: 'Invalid uuid', key: 'CREATE_VALIDATION_FAILED' },
  { pattern: 'Invalid enum value', key: 'CREATE_VALIDATION_FAILED' },
  { pattern: 'Required', key: 'CREATE_VALIDATION_FAILED' },
  { pattern: 'Validation failed', key: 'CREATE_VALIDATION_FAILED' },
  { pattern: 'Backend error 401', key: 'CREATE_SESSION_EXPIRED' },
  { pattern: 'Backend error 403', key: 'CREATE_FORBIDDEN' },
  { pattern: 'Unauthorized', key: 'CREATE_SESSION_EXPIRED' },
  { pattern: 'Forbidden', key: 'CREATE_FORBIDDEN' },
]

export function resolveMissionCreateToastMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  const tooLong = /at most (\d+) character/i.exec(msg)
  if (tooLong) {
    const n = Number.parseInt(tooLong[1] ?? '', 10)
    if (Number.isFinite(n) && n > 0) {
      return `Mission text is too long. Use at most ${n.toLocaleString()} characters.`
    }
  }
  for (const { pattern, key } of MISSION_CREATE_BACKEND_ERROR_MAP) {
    const matches = typeof pattern === 'string' ? msg.includes(pattern) : pattern.test(msg)
    if (matches) return MISSION_CONTROL_TOAST_ERRORS[key].userMessage
  }
  return MISSION_CONTROL_TOAST_ERRORS.CREATE_FAILED.userMessage
}
