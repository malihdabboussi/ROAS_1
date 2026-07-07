import type { LinkPreview } from '../link-preview.types'
import { safeFetchText } from './safe-fetch'

const META_RE =
  /<meta\s+[^>]*(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>|<meta\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']([^"']+)["'][^>]*>/gi
const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i
const ICON_RE =
  /<link\s+[^>]*rel=["'][^"']*(?:icon|shortcut icon)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function absoluteUrl(base: string, maybeUrl: string | null): string | null {
  if (!maybeUrl) return null
  try {
    return new URL(maybeUrl, base).toString()
  } catch {
    return null
  }
}

function metaValue(meta: Map<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const found = meta.get(key.toLowerCase())
    if (found) return decodeHtml(found)
  }
  return null
}

export async function fetchGenericPreview(url: string): Promise<LinkPreview | null> {
  try {
    const html = await safeFetchText(url)
    const meta = new Map<string, string>()
    let match: RegExpExecArray | null
    while ((match = META_RE.exec(html))) {
      const key = match[1] ?? match[4]
      const value = match[2] ?? match[3]
      if (key && value) meta.set(key.toLowerCase(), value)
    }
    const titleFromTag = TITLE_RE.exec(html)?.[1]
    const iconFromTag = ICON_RE.exec(html)?.[1] ?? null
    const title =
      metaValue(meta, 'og:title', 'twitter:title') ??
      (titleFromTag ? decodeHtml(titleFromTag) : null)
    const description = metaValue(meta, 'og:description', 'twitter:description', 'description')
    const imageUrl = absoluteUrl(url, metaValue(meta, 'og:image', 'twitter:image'))
    const iconUrl = absoluteUrl(url, iconFromTag)
    const siteName = metaValue(meta, 'og:site_name') ?? new URL(url).host.replace(/^www\./, '')
    if (!title && !description && !imageUrl) return null
    return {
      url,
      provider: 'generic',
      title,
      description,
      imageUrl,
      iconUrl,
      siteName,
    }
  } catch {
    return null
  }
}
