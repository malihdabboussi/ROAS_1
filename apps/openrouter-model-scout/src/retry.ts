const RETRY_DELAYS_MS = [500, 1_500]

function isTransientOpenRouterError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /\b429\b|\b5\d\d\b|rate.?limit|temporar|timeout|ECONNRESET|ETIMEDOUT/i.test(message)
}

export async function withOpenRouterRetry<T>(
  operation: () => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const delay = RETRY_DELAYS_MS[attempt]
      if (delay === undefined || !isTransientOpenRouterError(error)) throw error
      await wait(delay)
    }
  }
  throw lastError
}
