/**
 * Resolves Meta Pixel IDs and event name for a funnel page from funnel metadata.
 * Supports meta_pixels (array) or legacy meta_pixel_id; meta_events (page_type -> event) with defaults by funnel_type.
 */

export type FunnelMeta = {
  metadata?: Record<string, unknown> | null
  funnel_type?: string | null
}

/** Page types we map to events (opt-in, thank-you, confirmation). Others default to PageView. */
const PAGE_EVENT_KEYS = ['opt-in', 'thank-you', 'confirmation'] as const

/** Default event by funnel_type for opt-in, thank-you, confirmation. */
const DEFAULTS: Record<string, Record<string, string>> = {
  webinar: {
    'opt-in': 'ViewContent',
    'thank-you': 'CompleteRegistration',
    confirmation: 'CompleteRegistration',
  },
  'call-booking': { 'opt-in': 'ViewContent', 'thank-you': 'Schedule', confirmation: 'Schedule' },
  vsl: { 'opt-in': 'ViewContent', 'thank-you': 'Schedule', confirmation: 'Schedule' },
  'lead-magnet': { 'opt-in': 'ViewContent', 'thank-you': 'Lead', confirmation: 'Lead' },
  'sales-page': { 'opt-in': 'ViewContent', 'thank-you': 'Lead', confirmation: 'Lead' },
}
const FALLBACK: Record<string, string> = {
  'opt-in': 'ViewContent',
  'thank-you': 'Lead',
  confirmation: 'Lead',
}

function getDefaultEvent(funnelType: string | null | undefined, pageType: string): string {
  if (!PAGE_EVENT_KEYS.includes(pageType as any)) return 'PageView'
  const map = (funnelType && DEFAULTS[funnelType]) || FALLBACK
  return map[pageType as keyof typeof map] ?? 'PageView'
}

function extractMetaPixelIdsFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): string[] {
  if (!meta || typeof meta !== 'object') return []

  const pixels = meta.meta_pixels
  if (Array.isArray(pixels) && pixels.length > 0) {
    const ids: string[] = []
    for (const p of pixels) {
      const id =
        typeof p === 'object' && p !== null && typeof (p as any).id === 'string'
          ? (p as any).id.trim()
          : typeof p === 'string'
            ? String(p).trim()
            : ''
      if (/^\d{5,20}$/.test(id)) ids.push(id)
    }
    if (ids.length > 0) return ids
  }

  const legacy = meta.meta_pixel_id
  if (typeof legacy === 'string' && /^\d{5,20}$/.test(legacy.trim())) return [legacy.trim()]
  return []
}

/**
 * Controls pixel init + Meta UI sections. Explicit `meta_pixel_enabled === false` disables injection
 * regardless of saved pixel IDs. Undefined + zero pixels ⇒ off; undefined + pixels ⇒ on (legacy).
 */
export function isMetaPixelEnabled(funnel: FunnelMeta): boolean {
  const meta = funnel.metadata
  if (!meta || typeof meta !== 'object') return false
  const m = meta as Record<string, unknown>
  if (m.meta_pixel_enabled === false) return false
  if (m.meta_pixel_enabled === true) return true
  return extractMetaPixelIdsFromMetadata(m).length > 0
}

export function resolveMetaPixelIds(funnel: FunnelMeta): string[] {
  const meta = funnel.metadata
  if (!meta || typeof meta !== 'object') return []
  const m = meta as Record<string, unknown>
  if (m.meta_pixel_enabled === false) return []
  return extractMetaPixelIdsFromMetadata(m)
}

/** Default true (back-compat). False only when explicitly set via `metadata.meta_events_enabled === false`. */
export function isMetaEventsEnabled(funnel: FunnelMeta): boolean {
  const meta = funnel.metadata
  if (!meta || typeof meta !== 'object') return true
  return (meta as Record<string, unknown>).meta_events_enabled !== false
}

export function resolveMetaEventForPage(funnel: FunnelMeta, pageType: string): string {
  if (!isMetaPixelEnabled(funnel)) return ''
  if (!isMetaEventsEnabled(funnel)) return ''
  const meta = funnel.metadata
  const events =
    meta && typeof meta === 'object' && meta.meta_events && typeof meta.meta_events === 'object'
      ? (meta.meta_events as Record<string, unknown>)
      : null
  const raw = events && typeof events[pageType] === 'string' ? String(events[pageType]).trim() : ''
  if (raw) return raw
  return getDefaultEvent(funnel.funnel_type, pageType)
}
