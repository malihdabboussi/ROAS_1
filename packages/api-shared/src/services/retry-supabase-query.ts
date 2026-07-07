import { isTransientNetworkError } from './transient-error.util'

export type RetrySupabaseQueryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  errorPrefix: string
  logger?: { warn: (msg: string) => void }
}

/**
 * Retries a Supabase query when the error is transient (network-level).
 * Designed for webhook hot paths where a missed call = lost user message.
 * Works on top of `createResilientFetch` (fetch-level retries) as a second layer.
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
  options: RetrySupabaseQueryOptions,
): Promise<T | null> {
  const { maxAttempts = 3, baseDelayMs = 150, errorPrefix, logger } = options
  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data, error } = await queryFn()
    if (!error) return data

    lastError = error.message
    if (!isTransientNetworkError(lastError) || attempt === maxAttempts) break

    logger?.warn(`${errorPrefix} (attempt ${attempt}/${maxAttempts}) transient error: ${lastError}`)
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt))
  }

  throw new Error(`${errorPrefix}: ${lastError ?? 'unknown error'}`)
}
