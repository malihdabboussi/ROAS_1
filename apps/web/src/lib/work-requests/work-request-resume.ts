/** Extract the public review token from a Service Request review URL. */
export function extractWorkRequestTokenFromUrl(reviewUrl: string): string | null {
  try {
    const url = new URL(reviewUrl, 'https://app.roas.io')
    const match = url.pathname.match(/\/request-review\/([^/]+)\/?$/)
    const token = match?.[1]?.trim() ?? ''
    return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null
  } catch {
    return null
  }
}
