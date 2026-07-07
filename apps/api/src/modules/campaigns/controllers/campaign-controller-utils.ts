const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CampaignKnowledgeDomain =
  | 'strategy'
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'creative'
  | 'general'

export function isCampaignUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function parseOptionalUuidCsv(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return []
  return trimmed
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id))
}
