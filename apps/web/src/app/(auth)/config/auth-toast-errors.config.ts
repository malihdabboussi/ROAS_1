/** User-facing auth errors */
export const AUTH_TOAST_ERRORS = {
  EMAIL_SIGNUP_FAILED: {
    userMessage: "I couldn't finish creating your account. Try again in a moment.",
  },
  ACCOUNT_EXISTS: {
    userMessage: 'An account with this email already exists. You can sign in.',
  },
} as const

/** Backend/Supabase auth error pattern -> toast config key. First match wins. */
export const AUTH_SIGNUP_ERROR_MAP: Array<{
  pattern: string | RegExp
  key: keyof typeof AUTH_TOAST_ERRORS
}> = [
  { pattern: 'registered', key: 'ACCOUNT_EXISTS' },
  { pattern: 'already exists', key: 'ACCOUNT_EXISTS' },
]

export function resolveAuthSignupErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  for (const { pattern, key } of AUTH_SIGNUP_ERROR_MAP) {
    const matches =
      typeof pattern === 'string'
        ? lowerMessage.includes(pattern.toLowerCase())
        : pattern.test(message)

    if (matches) return AUTH_TOAST_ERRORS[key].userMessage
  }

  return AUTH_TOAST_ERRORS.EMAIL_SIGNUP_FAILED.userMessage
}
