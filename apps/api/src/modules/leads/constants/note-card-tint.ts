/**
 * Allowed `contact_notes.card_tint` values — keep in sync with `TAG_COLORS[].id` in
 * `apps/web/.../field-color-presets-popover.tsx`.
 */
export const NOTE_CARD_TINT_IDS = [
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'slate',
] as const

export type NoteCardTintId = (typeof NOTE_CARD_TINT_IDS)[number]

export const NOTE_CARD_TINT_ID_SET = new Set<string>(NOTE_CARD_TINT_IDS)

export function normalizeIncomingNoteCardTint(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  return NOTE_CARD_TINT_ID_SET.has(s) ? s : null
}
