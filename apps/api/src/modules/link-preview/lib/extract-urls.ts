const HREF_RE = /href=["']([^"']+)["']/gi
const BARE_URL_RE = /https?:\/\/[^\s<>"']+/gi

export function extractUrlsFromHtml(html: string, max = 5): string[] {
  if (!html) return []
  const urls = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = HREF_RE.exec(html)) && urls.size < max) {
    if (m[1].startsWith('http')) urls.add(m[1])
  }
  if (urls.size < max) {
    while ((m = BARE_URL_RE.exec(html)) && urls.size < max) {
      urls.add(m[0])
    }
  }
  return Array.from(urls).slice(0, max)
}
