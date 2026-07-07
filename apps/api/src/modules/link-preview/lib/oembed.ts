import type { LinkPreview, LinkPreviewProvider } from '../link-preview.types'

const OEMBED_TIMEOUT_MS = 4_000

interface OEmbedResponse {
  title?: string
  author_name?: string
  provider_name?: string
  thumbnail_url?: string
  description?: string
}

const ENDPOINTS: Record<
  Exclude<LinkPreviewProvider, 'drive' | 'internal' | 'generic'>,
  (url: string) => string
> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  loom: (url) => `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}&format=json`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  figma: (url) => `https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`,
}

const SITE_NAMES: Record<Exclude<LinkPreviewProvider, 'drive' | 'internal' | 'generic'>, string> = {
  youtube: 'YouTube',
  loom: 'Loom',
  vimeo: 'Vimeo',
  figma: 'Figma',
}

export async function fetchOEmbed(
  provider: 'youtube' | 'loom' | 'vimeo' | 'figma',
  url: string,
): Promise<LinkPreview | null> {
  const endpoint = ENDPOINTS[provider](url)
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), OEMBED_TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      signal: ctl.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as OEmbedResponse
    return {
      url,
      provider,
      title: data.title ?? null,
      description: data.description ?? data.author_name ?? null,
      imageUrl: data.thumbnail_url ?? null,
      iconUrl: null,
      siteName: data.provider_name ?? SITE_NAMES[provider],
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
