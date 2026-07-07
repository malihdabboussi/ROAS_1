import type { Ad } from '../../../types'

export function formatAdText(text: string): string {
  return text.replace(/\\n/g, '\n')
}

export function pageName(ad: Ad): string {
  const raw = ad.display_link || ad.destination_url || ''
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '')
  } catch {
    return raw || 'Advertiser'
  }
}

export function igUsername(ad: Ad): string {
  const raw = ad.display_link || ad.destination_url || ''
  try {
    const host = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(
      /^www\./,
      '',
    )
    const parts = host.split('.')
    return parts.length >= 2
      ? `${parts[0]}.${parts[1]}`.toLowerCase()
      : parts[0]?.toLowerCase() || 'advertiser'
  } catch {
    return raw?.toLowerCase().replace(/[^a-z0-9._]/g, '') || 'advertiser'
  }
}

export function displayLinkUppercase(ad: Ad): string {
  const raw = ad.display_link || ad.destination_url || ''
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname
      .replace(/^www\./, '')
      .toUpperCase()
  } catch {
    return raw.toUpperCase() || 'ADVERTISER'
  }
}

export function placementRatio(p: string): string {
  if (p === 'story' || p === 'reels') return '9 / 16'
  return '1 / 1'
}

export function placementDims(p: string) {
  if (p === 'story' || p === 'reels') return { width: 1080, height: 1920 }
  return { width: 1080, height: 1080 }
}

export function resolveAdImageUrl(ad: Ad, placement: string): string | null {
  return ad.placement_images?.[placement]?.image_url ?? ad.image_url ?? null
}

export function resolveAdTsx(ad: Ad, placement: string): string | null {
  return ad.placement_tsx?.[placement] ?? ad.generated_tsx
}
