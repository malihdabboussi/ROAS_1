/** User-facing auth errors returned by API auth endpoints */
export const AUTH_ERROR_MESSAGES = {
  REGISTER_FAILED: "I couldn't finish creating your account. Try again in a moment.",
  ACCOUNT_EXISTS: 'An account with this email already exists.',
  PUBLIC_SIGNUP_CLOSED:
    'Public sign-ups are closed right now. Sign in if you already have an account, or use an invite.',
} as const

/** Supabase/backend error pattern -> auth error key. First match wins. */
export const AUTH_REGISTER_ERROR_MAP: Array<{
  pattern: string | RegExp
  key: keyof typeof AUTH_ERROR_MESSAGES
  status: 400 | 409
}> = [
  { pattern: 'already registered', key: 'ACCOUNT_EXISTS', status: 409 },
  { pattern: 'already been registered', key: 'ACCOUNT_EXISTS', status: 409 },
  { pattern: 'already exists', key: 'ACCOUNT_EXISTS', status: 409 },
]

export function resolveAuthRegisterError(message: string): {
  error: string
  status: 400 | 409
} {
  const lowerMessage = message.toLowerCase()

  for (const { pattern, key, status } of AUTH_REGISTER_ERROR_MAP) {
    const matches =
      typeof pattern === 'string'
        ? lowerMessage.includes(pattern.toLowerCase())
        : pattern.test(message)

    if (matches) {
      return { error: AUTH_ERROR_MESSAGES[key], status }
    }
  }

  return { error: AUTH_ERROR_MESSAGES.REGISTER_FAILED, status: 400 }
}
