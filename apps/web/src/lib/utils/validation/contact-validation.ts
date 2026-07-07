export function validateWebsite(url: string): boolean {
  if (!url) return true
  try {
    const urlWithProtocol =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    const parsedUrl = new URL(urlWithProtocol)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeWebsiteUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}
