export const FUNNEL_CARD_FIELD_IDS = [
  'funnel_type',
  'status',
  'published_url',
  'created_at',
  'updated_at',
] as const

export type FunnelCardFieldId = (typeof FUNNEL_CARD_FIELD_IDS)[number]

export const DEFAULT_FUNNEL_CARD_FIELDS: FunnelCardFieldId[] = ['funnel_type', 'status']

const ALLOWED = new Set<string>(FUNNEL_CARD_FIELD_IDS)

export function normalizeFunnelCardFieldOrder(raw?: string[] | null): FunnelCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_FUNNEL_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: FunnelCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as FunnelCardFieldId)
  }
  return out
}

export const FUNNEL_CARD_FIELD_LABEL: Record<FunnelCardFieldId, string> = {
  funnel_type: 'Type',
  status: 'Status',
  published_url: 'URL',
  created_at: 'Created',
  updated_at: 'Updated',
}
