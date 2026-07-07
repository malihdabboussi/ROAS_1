export const FORM_CARD_FIELD_IDS = [
  'status',
  'visibility',
  'responses_count',
  'question_count',
  'published_url',
  'target_space',
  'created_at',
  'updated_at',
  'last_response_at',
  'slug',
] as const

export type FormCardFieldId = (typeof FORM_CARD_FIELD_IDS)[number]

export const DEFAULT_FORM_CARD_FIELDS: FormCardFieldId[] = ['status', 'visibility', 'created_at']

const ALLOWED = new Set<string>(FORM_CARD_FIELD_IDS)

export function normalizeFormCardFieldOrder(raw?: string[] | null): FormCardFieldId[] {
  if (raw === undefined || raw === null) return [...DEFAULT_FORM_CARD_FIELDS]
  if (raw.length === 0) return []
  const seen = new Set<string>()
  const out: FormCardFieldId[] = []
  for (const id of raw) {
    if (!ALLOWED.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id as FormCardFieldId)
  }
  return out
}

export const FORM_CARD_FIELD_LABEL: Record<FormCardFieldId, string> = {
  status: 'Status',
  visibility: 'Visibility',
  responses_count: 'Responses',
  question_count: 'Questions',
  published_url: 'URL',
  target_space: 'Target space',
  created_at: 'Created',
  updated_at: 'Updated',
  last_response_at: 'Last response',
  slug: 'Slug',
}
