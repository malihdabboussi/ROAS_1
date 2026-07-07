import type { CSSProperties } from 'react'
import { hexToRGB } from '@/lib/utils/colors/color-utils'
import { PRESET_HEX, TAG_COLORS } from '../cells/field-color-presets-popover'

export type NoteCardTintId = (typeof TAG_COLORS)[number]['id']

const NOTE_TINT_ID_SET = new Set<string>(TAG_COLORS.map((c) => c.id))

export function normalizeNoteCardTint(raw: unknown): NoteCardTintId | null {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  return NOTE_TINT_ID_SET.has(s) ? (s as NoteCardTintId) : null
}

/** Read tint from activity/API payload whether key is snake_case or camelCase. */
export function notePayloadCardTint(
  payload: Record<string, unknown> | null | undefined,
): string | null | undefined {
  if (payload == null) return undefined
  const snake = payload.card_tint
  if (snake != null && snake !== '') return typeof snake === 'string' ? snake : String(snake)
  const camel = payload.cardTint
  if (camel != null && camel !== '') return typeof camel === 'string' ? camel : String(camel)
  return undefined
}

export function contactNoteCardSurface(tint: string | null | undefined): {
  className: string
  style?: CSSProperties
} {
  const id = normalizeNoteCardTint(tint)
  if (!id) {
    return { className: 'card-glass rounded-spacing-2' }
  }
  const hex = PRESET_HEX[id] ?? '#374151'
  const { r, g, b } = hexToRGB(hex)
  return {
    className: 'rounded-spacing-2',
    style: {
      background: `linear-gradient(135deg, rgba(${r},${g},${b},0.08) 0%, rgba(${r},${g},${b},0.14) 50%, rgba(${r},${g},${b},0.06) 100%)`,
      border: `1px solid rgba(${r},${g},${b},0.35)`,
      boxShadow: `0 4px 16px rgba(${r},${g},${b},0.1), inset 0 1px 0 rgba(255,255,255,0.05)`,
    },
  }
}
