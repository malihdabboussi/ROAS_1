export const AVATAR_CARD_FIELD_IDS = ['offer', 'created_at', 'updated_at'] as const

export type AvatarCardFieldId = (typeof AVATAR_CARD_FIELD_IDS)[number]

export const DEFAULT_AVATAR_CARD_FIELDS: AvatarCardFieldId[] = ['offer', 'created_at']

const ALLOWED = new Set<string>(AVATAR_CARD_FIELD_IDS)

export function normalizeAvatarCardFieldOrder(raw?: string[] | null): AvatarCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_AVATAR_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: AvatarCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as AvatarCardFieldId)
  }
  return out
}

export const AVATAR_CARD_FIELD_LABEL: Record<AvatarCardFieldId, string> = {
  offer: 'Offer',
  created_at: 'Created',
  updated_at: 'Updated',
}

export function resolveAvatarPortraitSrc(
  personaData: Record<string, unknown> | undefined | null,
): string | undefined {
  if (!personaData) return undefined
  const v = personaData.avatar_image
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t !== '' ? t : undefined
}
