/**
 * Login resilience helpers (referenced by page.tsx since the transient-Supabase-
 * latency fix, but the file never landed on main — restored here).
 */

const AUTH_LOGIN_TIMEOUT_MS = 15_000

export const AUTH_LOGIN_MESSAGES = {
  TIMED_OUT: 'Sign-in is taking longer than expected. Check your connection and try again.',
  UNAVAILABLE: "Couldn't reach the sign-in service. Try again in a moment.",
} as const

/**
 * Race a Supabase auth call against a timeout so a hung request surfaces a
 * friendly error instead of leaving the form spinning forever.
 */
export function withAuthLoginTimeout<T>(
  promise: Promise<T>,
  timeoutMs = AUTH_LOGIN_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(AUTH_LOGIN_MESSAGES.TIMED_OUT))
    }, timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (reason) => {
        clearTimeout(timer)
        reject(reason instanceof Error ? reason : new Error(String(reason)))
      },
    )
  })
}

/** User-facing message for a failed/unavailable sign-in attempt. */
export function resolveAuthLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim().length > 0
  ) {
    return (error as { message: string }).message
  }
  return AUTH_LOGIN_MESSAGES.UNAVAILABLE
}
