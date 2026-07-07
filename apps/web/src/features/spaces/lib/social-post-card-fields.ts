export const SOCIAL_POST_CARD_FIELD_IDS = [
  'platform',
  'post_type',
  'status',
  'created_at',
  'updated_at',
  'scheduled_at',
] as const

export type SocialPostCardFieldId = (typeof SOCIAL_POST_CARD_FIELD_IDS)[number]

export const DEFAULT_SOCIAL_POST_CARD_FIELDS: SocialPostCardFieldId[] = [
  'platform',
  'post_type',
  'status',
]

const ALLOWED = new Set<string>(SOCIAL_POST_CARD_FIELD_IDS)

export function normalizeSocialPostCardFieldOrder(raw?: string[] | null): SocialPostCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_SOCIAL_POST_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: SocialPostCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as SocialPostCardFieldId)
  }
  return out
}

export const SOCIAL_POST_CARD_FIELD_LABEL: Record<SocialPostCardFieldId, string> = {
  platform: 'Platform',
  post_type: 'Format',
  status: 'Status',
  created_at: 'Created',
  updated_at: 'Updated',
  scheduled_at: 'Scheduled',
}
