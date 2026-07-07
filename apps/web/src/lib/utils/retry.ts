/**
 * Retry utility with exponential backoff
 * Ported from legacy app — used for auto-save operations
 */

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  retryCondition?: (error: unknown) => boolean
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = defaultRetryCondition,
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt === maxAttempts) break
      if (!retryCondition(lastError)) break
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      await new Promise((r) => setTimeout(r, delay + Math.random() * 1000))
    }
  }

  throw lastError
}

function defaultRetryCondition(error: unknown): boolean {
  const e = error as { code?: string; name?: string; message?: string; status?: number }
  if (e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT') return true
  if (e.name === 'TypeError' && e.message?.includes('fetch')) return true
  if (e.status && e.status >= 500 && e.status < 600) return true
  if (e.status === 429) return true
  return false
}

export const RETRY_CONFIGS = {
  API_CALL: { maxAttempts: 6, baseDelay: 1000, maxDelay: 5000 },
} as const
