import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { readFieldValue, readItemAssignees } from '../components/space-item-values'
import type { SpaceItem } from '../types'
import type { FieldDef, ViewDef } from '../types/space-schema'
import {
  isCallDateInPastThroughTomorrow,
  itemCallDateIso,
  resolveCallDateWindow,
} from './meetings-call-date-window'

function normalizeFilterValues(raw: string | string[] | undefined): string[] {
  if (raw == null) return []
  return (Array.isArray(raw) ? raw : [raw]).map((v) => String(v).trim()).filter(Boolean)
}

/**
 * Resolve Meetings `entry_type` even when custom_data is incomplete so
 * call vs follow-up views stay exclusive.
 */
export function resolveSpaceEntryType(item: SpaceItem): 'call' | 'follow_up' | null {
  const raw = readFieldValue(item, 'entry_type')
  if (raw === 'call' || raw === 'follow_up') return raw
  if (item.source === 'fathom') return 'call'
  if (item.source === 'agent_suggested') return 'follow_up'
  const title = String(item.title ?? '')
  if (/^(Meeting:|Fathom meeting:)/i.test(title)) return 'call'
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  if (cd.recording_url || cd.fathom_url || cd.fathom_meeting_id || cd.external_automation) {
    return 'call'
  }
  if (cd.suggestion_origin) return 'follow_up'
  return null
}

/**
 * Hard view filters. Prefer explicit `field_value_filters`; fall back to the
 * Meetings template view ids so call/follow-up tabs stay correct even if a
 * customize-save dropped the filter object from schema.
 */
export function resolveViewFieldValueFilters(
  view: Pick<ViewDef, 'id' | 'field_value_filters'>,
): Record<string, string | string[]> | undefined {
  if (view.field_value_filters && Object.keys(view.field_value_filters).length > 0) {
    return view.field_value_filters
  }
  if (view.id === 'all-meetings') return { entry_type: 'call' }
  if (view.id === 'follow-ups' || view.id === 'action-items') return { entry_type: 'follow_up' }
  return undefined
}

/** Follow-ups / Action items show nested follow-ups as main rows. */
export function viewPromotesFollowUpSubtasks(
  view: Pick<ViewDef, 'id' | 'field_value_filters'>,
): boolean {
  const filters = resolveViewFieldValueFilters(view)
  const allowed = normalizeFilterValues(filters?.entry_type)
  if (allowed.includes('follow_up')) return true
  return view.id === 'follow-ups' || view.id === 'action-items'
}

function readSourceCallItemId(item: SpaceItem): string | null {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const raw = cd.source_call_item_id
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/** Parent call id for a follow-up — real parent or denormalized source_call link. */
export function resolveFollowUpParentCallId(item: SpaceItem): string | null {
  if (resolveSpaceEntryType(item) !== 'follow_up') return null
  if (item.parent_item_id) return item.parent_item_id
  return readSourceCallItemId(item)
}

/**
 * All Meetings: calls as top-level rows, plus follow-ups nested under those
 * calls (via parent_item_id or source_call_item_id) for expand/collapse.
 */
export function filterItemsForMeetingsListView(
  items: SpaceItem[],
  view: Pick<ViewDef, 'id' | 'field_value_filters'>,
): SpaceItem[] | null {
  const filters = resolveViewFieldValueFilters(view)
  const allowed = normalizeFilterValues(filters?.entry_type)
  const isAllMeetings =
    view.id === 'all-meetings' || (allowed.length === 1 && allowed[0] === 'call')
  if (!isAllMeetings) return null

  const calls = items.filter((item) => resolveSpaceEntryType(item) === 'call')
  const callIds = new Set(calls.map((item) => item.id))
  const nested = items.filter((item) => {
    if (resolveSpaceEntryType(item) !== 'follow_up') return false
    const parentId = resolveFollowUpParentCallId(item)
    return Boolean(parentId && callIds.has(parentId))
  })
  return [...calls, ...nested]
}

/** True when item field value matches any allowed filter value. */
export function itemMatchesFieldValueFilters(
  item: SpaceItem,
  filters: Record<string, string | string[]> | undefined,
): boolean {
  if (!filters) return true
  for (const [fieldId, rawAllowed] of Object.entries(filters)) {
    const allowed = normalizeFilterValues(rawAllowed)
    if (allowed.length === 0) continue
    const value =
      fieldId === 'entry_type' ? resolveSpaceEntryType(item) : readFieldValue(item, fieldId)
    const asString =
      value == null || value === '' ? null : Array.isArray(value) ? null : String(value)
    // Missing / unknown does NOT match All Meetings — only real calls do.
    if (asString == null) return false
    if (!allowed.includes(asString)) return false
  }
  return true
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpaceItemConsideredClosed(
  item: SpaceItem,
  statusField: FieldDef | undefined,
): boolean {
  const opt = statusField?.options?.find((o) => o.id === item.status)
  const g = opt?.group
  if (g === 'done' || g === 'closed') return true
  return (item.status as string) === 'done' || (item.status as string) === 'archived'
}

export function rosterEntryForItemAssignee(
  item: SpaceItem,
  roster: TeamRosterEntry[],
): TeamRosterEntry | null {
  return rosterEntriesForItemAssignees(item, roster)[0] ?? null
}

export function rosterEntriesForItemAssignees(
  item: SpaceItem,
  roster: TeamRosterEntry[],
): TeamRosterEntry[] {
  return readItemAssignees(item)
    .map((assignee) =>
      assignee.type === 'human'
        ? roster.find((r) => r.kind === 'human' && r.user_id === assignee.id)
        : roster.find((r) => r.kind === 'agent' && r.agent_key === assignee.id),
    )
    .filter((entry): entry is TeamRosterEntry => entry != null)
}

export function buildItemSearchHaystack(item: SpaceItem): string {
  const parts = [item.title]
  if (typeof item.notes === 'string') parts.push(stripHtml(item.notes))
  if (typeof item.description === 'string') parts.push(item.description)
  if (typeof item.doc_body === 'string') parts.push(stripHtml(item.doc_body))
  return parts.join(' ').toLowerCase()
}

export function buildDocToolbarSearchHaystack(item: SpaceItem): string {
  return (item.title ?? '').toLowerCase()
}

export function filterItemsByToolbarSearch(
  items: SpaceItem[],
  searchQuery: string,
  haystacks?: ReadonlyMap<string, string>,
): SpaceItem[] {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return items
  return items.filter((i) => {
    const haystack = haystacks?.get(i.id) ?? buildItemSearchHaystack(i)
    return haystack.includes(q)
  })
}

export function applySpaceToolbarFilters(
  items: SpaceItem[],
  view: ViewDef,
  statusField: FieldDef | undefined,
  roster: TeamRosterEntry[],
  currentUserId: string | null,
  searchQuery: string,
): SpaceItem[] {
  let out = items
  const meetingsList = filterItemsForMeetingsListView(items, view)
  if (meetingsList) {
    out = meetingsList
  } else {
    const fieldValueFilters = resolveViewFieldValueFilters(view)
    if (fieldValueFilters) {
      out = out.filter((i) => itemMatchesFieldValueFilters(i, fieldValueFilters))
    }
  }
  const showClosed = view.show_closed_tasks === true
  // When grouped by status, keep closed items visible so they appear under the Done/Archived
  // group buckets even if "show completed" is off.
  const groupedByStatus = view.group_by === 'status'
  if (!showClosed && !groupedByStatus && statusField) {
    out = out.filter((i) => !isSpaceItemConsideredClosed(i, statusField))
  }
  if (view.toolbar_assigned_to_me && currentUserId) {
    out = out.filter((i) =>
      readItemAssignees(i).some(
        (assignee) => assignee.type === 'human' && assignee.id === currentUserId,
      ),
    )
  } else if ((view.toolbar_filter_assignee_participant_ids?.length ?? 0) > 0) {
    const set = new Set(view.toolbar_filter_assignee_participant_ids)
    out = out.filter((i) => {
      const entries = rosterEntriesForItemAssignees(i, roster)
      return entries.some((entry) => set.has(entry.participant_id))
    })
  }
  if (resolveCallDateWindow(view) === 'past_through_tomorrow') {
    const visibleCallIds = new Set(
      out
        .filter((item) => resolveSpaceEntryType(item) === 'call')
        .filter((item) => isCallDateInPastThroughTomorrow(itemCallDateIso(item)))
        .map((item) => item.id),
    )
    out = out.filter((item) => {
      if (resolveSpaceEntryType(item) === 'call') return visibleCallIds.has(item.id)
      const parentId = resolveFollowUpParentCallId(item)
      return Boolean(parentId && visibleCallIds.has(parentId))
    })
  }
  const q = searchQuery.trim().toLowerCase()
  if (q) {
    out = filterItemsByToolbarSearch(out, q)
  }
  return out
}
