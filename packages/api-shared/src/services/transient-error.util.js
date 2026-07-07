'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.isTransientNetworkError = isTransientNetworkError
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
]
function isTransientNetworkError(input) {
  const message = input instanceof Error ? input.message : String(input)
  const value = message.toLowerCase()
  return TRANSIENT_ERROR_MARKERS.some((marker) => value.includes(marker))
}
