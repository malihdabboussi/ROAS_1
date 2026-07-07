import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { readItemAssignees } from '../components/space-item-values'
import type { SpaceItem } from '../types'
import type { FieldDef, ViewDef } from '../types/space-schema'

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
  const q = searchQuery.trim().toLowerCase()
  if (q) {
    out = filterItemsByToolbarSearch(out, q)
  }
  return out
}
