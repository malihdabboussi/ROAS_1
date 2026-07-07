export const AD_CARD_FIELD_IDS = [
  'platform',
  'placement',
  'ad_format',
  'status',
  'source',
  'ad_set',
  'created_at',
  'updated_at',
  'primary_text',
  'destination_url',
] as const

export type AdCardFieldId = (typeof AD_CARD_FIELD_IDS)[number]

export const DEFAULT_AD_CARD_FIELDS: AdCardFieldId[] = ['platform', 'placement', 'status']

const ALLOWED = new Set<string>(AD_CARD_FIELD_IDS)

export function normalizeAdCardFieldOrder(raw?: string[] | null): AdCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_AD_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: AdCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as AdCardFieldId)
  }
  return out
}

export const AD_CARD_FIELD_LABEL: Record<AdCardFieldId, string> = {
  platform: 'Platform',
  placement: 'Placement',
  ad_format: 'Format',
  status: 'Status',
  source: 'Source',
  ad_set: 'Ad set',
  created_at: 'Created',
  updated_at: 'Updated',
  primary_text: 'Primary text',
  destination_url: 'Destination',
}
