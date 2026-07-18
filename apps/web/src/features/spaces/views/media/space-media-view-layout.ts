import type { MediaGroupBy, MediaLayoutMode, MediaPreviewCardSize } from '../../types/space-schema'

export function mediaCardGridClass(
  layout: MediaLayoutMode,
  cardSize: MediaPreviewCardSize,
): string {
  if (layout === 'list') return 'flex flex-col gap-spacing-2'
  if (layout === 'grid') {
    switch (cardSize) {
      case 'small':
        return 'grid grid-cols-3 gap-spacing-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
      case 'compact':
        return 'grid grid-cols-3 gap-spacing-2 md:grid-cols-4 lg:grid-cols-5'
      case 'preview':
      default:
        return 'grid grid-cols-2 gap-spacing-3 md:grid-cols-3 lg:grid-cols-4'
    }
  }
  switch (cardSize) {
    case 'small':
      return 'grid grid-cols-2 gap-spacing-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    case 'compact':
      return 'grid grid-cols-2 gap-spacing-3 sm:grid-cols-3 lg:grid-cols-4'
    case 'preview':
    default:
      return 'grid grid-cols-1 gap-spacing-4 sm:grid-cols-2 lg:grid-cols-3'
  }
}

export function mediaListThumbBoxClass(cardSize: MediaPreviewCardSize): string {
  switch (cardSize) {
    case 'small':
      return 'h-12 w-12 shrink-0 rounded-spacing-2'
    case 'compact':
      return 'h-14 w-14 shrink-0 rounded-spacing-2'
    case 'preview':
    default:
      return 'h-16 w-16 shrink-0 rounded-spacing-2'
  }
}

export function mediaDayKey(iso: string): string {
  return iso.slice(0, 10)
}

export function formatMediaGroupDisplayLabel(gb: MediaGroupBy, rawKey: string): string {
  if (gb === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(rawKey)) {
    const date = new Date(`${rawKey}T12:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }
  if (rawKey === 'unknown') return 'Unknown'
  return rawKey
}
