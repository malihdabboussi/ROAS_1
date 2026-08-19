export const AUTH_LOGIN_TIMEOUT_MS = 15_000
export const AUTH_LOGIN_TIMEOUT_MESSAGE =
  'Authentication is taking longer than expected. Please try again in a moment.'

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim()
  if (typeof error === 'string') return error.trim()
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message.trim() : ''
  }
  return ''
}

export function resolveAuthLoginErrorMessage(error: unknown): string {
  const message = readErrorMessage(error)
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials')) {
    return 'Invalid email or password.'
  }
  if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('verify your email')) {
    return 'Please verify your email.'
  }
  if (!message || message === '{}' || message === '[object Object]') {
    return AUTH_LOGIN_TIMEOUT_MESSAGE
  }
  return message
}

export function withAuthLoginTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(AUTH_LOGIN_TIMEOUT_MESSAGE)),
      AUTH_LOGIN_TIMEOUT_MS,
    )
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}
