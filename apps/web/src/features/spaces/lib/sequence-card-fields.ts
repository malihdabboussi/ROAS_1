export const SEQUENCE_CARD_FIELD_IDS = [
  'status',
  'funnel',
  'email_count',
  'trigger',
  'created_at',
  'updated_at',
] as const

export type SequenceCardFieldId = (typeof SEQUENCE_CARD_FIELD_IDS)[number]

export const DEFAULT_SEQUENCE_CARD_FIELDS: SequenceCardFieldId[] = [
  'status',
  'funnel',
  'email_count',
]

const ALLOWED = new Set<string>(SEQUENCE_CARD_FIELD_IDS)

export function normalizeSequenceCardFieldOrder(raw?: string[] | null): SequenceCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_SEQUENCE_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: SequenceCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as SequenceCardFieldId)
  }
  return out
}

export const SEQUENCE_CARD_FIELD_LABEL: Record<SequenceCardFieldId, string> = {
  status: 'Status',
  funnel: 'Funnel',
  trigger: 'Trigger',
  email_count: 'Emails',
  created_at: 'Created',
  updated_at: 'Updated',
}
