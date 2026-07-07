/** Meta standard events for funnel page mapping (fbq track names). */
export const FUNNEL_META_EVENTS: { value: string; label: string }[] = [
  { value: 'PageView', label: 'Page view' },
  { value: 'ViewContent', label: 'View content' },
  { value: 'Lead', label: 'Lead' },
  { value: 'CompleteRegistration', label: 'Complete registration' },
  { value: 'Schedule', label: 'Schedule (appointment booked)' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Subscribe', label: 'Subscribe' },
]

export type FunnelPixelEntry = { id: string; name?: string; source: 'integration' | 'manual' }

export function getFunnelPixelsFromMetadata(meta: Record<string, unknown> | null): FunnelPixelEntry[] {
  if (!meta || typeof meta !== 'object') return []
  const arr = meta.meta_pixels
  if (Array.isArray(arr) && arr.length > 0) {
    return arr
      .map((p): FunnelPixelEntry | null => {
        if (typeof p === 'object' && p !== null && typeof (p as { id?: string }).id === 'string') {
          const id = (p as { id: string }).id.trim()
          if (!/^\d{5,20}$/.test(id)) return null
          return {
            id,
            name:
              typeof (p as { name?: string }).name === 'string'
                ? (p as { name: string }).name
                : undefined,
            source:
              (p as { source?: string }).source === 'integration' ? 'integration' : 'manual',
          }
        }
        if (typeof p === 'string' && /^\d{5,20}$/.test(p.trim())) {
          return { id: p.trim(), source: 'manual' as const }
        }
        return null
      })
      .filter((x): x is FunnelPixelEntry => x !== null)
  }
  const legacy = meta.meta_pixel_id
  if (typeof legacy === 'string' && /^\d{5,20}$/.test(legacy.trim())) {
    return [{ id: legacy.trim(), source: 'manual' as const }]
  }
  return []
}
