const TRANSIENT_ERROR_MARKERS = [
  'aborterror',
  'fetch failed',
  'this operation was aborted',
  'etimedout',
  'econnreset',
  'eai_again',
  'enotfound',
  'und_err_connect_timeout',
  'und_err_socket',
  'econnrefused',
  'epipe',
] as const

export function isTransientNetworkError(input: unknown): boolean {
  const message = input instanceof Error ? input.message : String(input)
  const value = message.toLowerCase()
  return TRANSIENT_ERROR_MARKERS.some((marker) => value.includes(marker))
}
