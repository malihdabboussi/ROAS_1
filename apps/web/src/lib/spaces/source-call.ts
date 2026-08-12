import type { SpaceItem } from './space-item-types'

/** Read denormalized source-call pointers from a follow-up item. */
export function readSourceCallMeta(
  item: SpaceItem | undefined,
  value?: unknown,
): { itemId: string | null; title: string | null } {
  const cd = (item?.custom_data ?? {}) as Record<string, unknown>
  const origin =
    cd.suggestion_origin && typeof cd.suggestion_origin === 'object'
      ? (cd.suggestion_origin as Record<string, unknown>)
      : null
  const itemId =
    (typeof cd.source_call_item_id === 'string' && cd.source_call_item_id) ||
    (typeof origin?.rule_trigger_item_id === 'string' && origin.rule_trigger_item_id) ||
    null
  const fromValue = typeof value === 'string' ? value.trim() : ''
  const fromField = typeof cd.source_call === 'string' ? cd.source_call.trim() : ''
  const title = fromValue || fromField || null
  return { itemId, title }
}

export function cleanMeetingTitle(title: string | null | undefined): string {
  return String(title ?? '')
    .replace(/^Fathom meeting:\s*/i, '')
    .replace(/^Meeting:\s*/i, '')
    .trim()
}
