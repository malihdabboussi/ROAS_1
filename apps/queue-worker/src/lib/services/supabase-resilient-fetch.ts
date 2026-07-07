type ResilientFetchOptions = {
  label: string
  maxRetries?: number
  timeoutMs?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524])
const RETRYABLE_CODES = new Set([
  'ENOTFOUND',
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'ECONNREFUSED',
  'EPIPE',
])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string') return code
  const causeCode = (error as { cause?: { code?: unknown } }).cause?.code
  return typeof causeCode === 'string' ? causeCode : null
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
}

export function createResilientFetch(options: ResilientFetchOptions): typeof fetch {
  const { label, maxRetries = 3, timeoutMs = 7000, baseDelayMs = 250, maxDelayMs = 3000 } = options

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let attempt = 0
    while (true) {
      const timeoutController = new AbortController()
      const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)
      try {
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutController.signal])
          : timeoutController.signal
        const response = await fetch(input, { ...(init || {}), signal })
        clearTimeout(timeout)

        if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxRetries) {
          return response
        }

        const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt))
        const jitter = Math.floor(Math.random() * 100)
        console.debug(
          `[supabase_fetch] label=${label} attempt=${attempt + 1} retry_status=${response.status}`,
        )
        await sleep(backoff + jitter)
        attempt += 1
      } catch (error) {
        clearTimeout(timeout)
        const code = getErrorCode(error)
        const retryable = (code !== null && RETRYABLE_CODES.has(code)) || isAbortError(error)
        if (!retryable || attempt >= maxRetries) {
          throw error
        }

        const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt))
        const jitter = Math.floor(Math.random() * 100)
        console.debug(
          `[supabase_fetch] label=${label} attempt=${attempt + 1} retry_error=${code || 'abort'}`,
        )
        await sleep(backoff + jitter)
        attempt += 1
      }
    }
  }
}
