export function isRetryableAgentFailure(failed: string | undefined): boolean {
  if (!failed) return false
  const msg = failed.toLowerCase()
  return (
    msg.includes('stream_stalled') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('service unavailable') ||
    msg.includes('session store lock') ||
    msg.includes('timeout waiting for session') ||
    msg.includes('gateway connection') ||
    msg.includes('fetch failed') ||
    msg.includes('econnrefused')
  )
}
