export const PRESENTATION_CARD_FIELD_IDS = [
  'status',
  'slide_count',
  'published_url',
  'slug',
  'offer',
  'created_at',
  'updated_at',
] as const

export type PresentationCardFieldId = (typeof PRESENTATION_CARD_FIELD_IDS)[number]

export const DEFAULT_PRESENTATION_CARD_FIELDS: PresentationCardFieldId[] = [
  'status',
  'slide_count',
  'published_url',
]

const ALLOWED = new Set<string>(PRESENTATION_CARD_FIELD_IDS)

export function normalizePresentationCardFieldOrder(
  raw?: string[] | null,
): PresentationCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_PRESENTATION_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: PresentationCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as PresentationCardFieldId)
  }
  return out
}

export const PRESENTATION_CARD_FIELD_LABEL: Record<PresentationCardFieldId, string> = {
  status: 'Status',
  slide_count: 'Slides',
  published_url: 'URL',
  slug: 'Slug',
  offer: 'Offer',
  created_at: 'Created',
  updated_at: 'Updated',
}
