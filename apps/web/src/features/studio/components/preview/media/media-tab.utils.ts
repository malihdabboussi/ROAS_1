import type { MediaAsset } from '@/lib/services/media-api'

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isMarkdownMediaAsset(asset: MediaAsset): boolean {
  const mime = (asset.mime_type ?? '').toLowerCase()
  if (mime.includes('markdown') || mime === 'text/x-markdown') return true
  const pathLike = (asset.original_filename || asset.name || '').toLowerCase()
  return pathLike.endsWith('.md') || pathLike.endsWith('.markdown')
}

export function isPdfFileUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url)
}

export function isImageFileUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|heic|heif)(\?|#|$)/i.test(url)
}

export function isImageMime(mime: string | undefined | null): boolean {
  return typeof mime === 'string' && mime.startsWith('image/')
}

const LINK_REGEX = /https?:\/\/[^\s<>"')\]]+/g

export function extractLinksFromText(text: string): { url: string; title: string }[] {
  const matches = text.match(LINK_REGEX)
  if (!matches) return []
  const seen = new Set<string>()
  const results: { url: string; title: string }[] = []
  for (const url of matches) {
    const clean = url.replace(/[.,;:!?]+$/, '')
    if (seen.has(clean)) continue
    seen.add(clean)
    let title: string
    try {
      const parsed = new URL(clean)
      title = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
    } catch {
      title = clean
    }
    results.push({ url: clean, title })
  }
  return results
}
