import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  htmlToPlainTextPreview,
  readFieldValue,
  readItemAssignees,
} from '../components/space-item-values'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

function assigneeSortKey(item: SpaceItem, roster: TeamRosterEntry[]): string {
  const labels = readItemAssignees(item).map((assignee) => {
    const entry =
      assignee.type === 'agent'
        ? roster.find((r) => r.kind === 'agent' && r.agent_key === assignee.id)
        : roster.find((r) => r.kind === 'human' && r.user_id === assignee.id)
    return entry?.display_name ?? assignee.id
  })
  return labels.sort().join('\u0001').toLowerCase()
}

function selectOptionLabel(field: FieldDef, raw: unknown): string {
  if (raw == null || raw === '') return ''
  const id = String(raw)
  const opt = field.options?.find((o) => o.id === id)
  return (opt?.label ?? id).toLowerCase()
}

function optionOrderIndex(field: FieldDef, raw: unknown): number {
  if (raw == null || raw === '') return -1
  const id = String(raw)
  const opts = field.options ?? []
  const i = opts.findIndex((o) => o.id === id)
  return i >= 0 ? i : 9999
}

function stringKey(fieldId: string, raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'string') {
    if (fieldId === 'notes') return htmlToPlainTextPreview(raw).toLowerCase()
    return raw.toLowerCase()
  }
  return String(raw).toLowerCase()
}

function numberKey(raw: unknown): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function dateKey(raw: unknown): number {
  if (typeof raw !== 'string' || !raw) return 0
  const t = Date.parse(raw)
  return Number.isNaN(t) ? 0 : t
}

function multiSelectKey(field: FieldDef, raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) return ''
  const opts = field.options ?? []
  const labels = raw.map((id) => opts.find((o) => o.id === String(id))?.label ?? String(id)).sort()
  return labels.join('\u0001').toLowerCase()
}

/**
 * Primary sort key for one item (ascending). Tie-break: `id`.
 */
export function compareSpaceListItems(
  a: SpaceItem,
  b: SpaceItem,
  field: FieldDef,
  roster: TeamRosterEntry[],
): number {
  const idCmp = a.id.localeCompare(b.id)
  const ra = readFieldValue(a, field.id)
  const rb = readFieldValue(b, field.id)

  let cmp = 0
  switch (field.type) {
    case 'assignee':
      cmp = assigneeSortKey(a, roster).localeCompare(assigneeSortKey(b, roster))
      break
    case 'select':
      if (field.id === 'priority') {
        cmp = optionOrderIndex(field, ra) - optionOrderIndex(field, rb)
      } else {
        cmp = selectOptionLabel(field, ra).localeCompare(selectOptionLabel(field, rb))
      }
      break
    case 'multi_select':
      cmp = multiSelectKey(field, ra).localeCompare(multiSelectKey(field, rb))
      break
    case 'number':
    case 'rating':
    case 'progress':
      cmp = numberKey(ra) - numberKey(rb)
      break
    case 'currency':
      cmp = numberKey(ra) - numberKey(rb)
      break
    case 'checkbox':
      cmp = (ra === true ? 1 : 0) - (rb === true ? 1 : 0)
      break
    case 'date':
    case 'created_at':
    case 'updated_at':
      cmp = dateKey(ra) - dateKey(rb)
      break
    case 'mission':
      cmp = stringKey(field.id, ra).localeCompare(stringKey(field.id, rb))
      break
    default:
      cmp = stringKey(field.id, ra).localeCompare(stringKey(field.id, rb))
  }

  if (cmp !== 0) return cmp
  return idCmp
}

export function sortSpaceItemsCopy(
  items: SpaceItem[],
  field: FieldDef,
  roster: TeamRosterEntry[],
  dir: 'asc' | 'desc',
): SpaceItem[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => sign * compareSpaceListItems(a, b, field, roster))
}
