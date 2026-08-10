import type { SpaceItem } from '../types'

export type DelegationDeskFilter = 'outstanding' | 'holding' | 'ready' | 'delegated' | 'completed'

export const DELEGATION_DESK_FILTERS: Array<{
  id: DelegationDeskFilter
  label: string
}> = [
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'holding', label: 'Holding tank' },
  { id: 'ready', label: 'Ready' },
  { id: 'delegated', label: 'Delegated' },
  { id: 'completed', label: 'Done' },
]

const HOLDING_STATUSES = new Set(['inbox', 'processing'])
const READY_STATUSES = new Set(['ready_review', 'approved', 'blocked'])
const DELEGATED_STATUSES = new Set(['dispatched', 'in_progress'])
const COMPLETED_STATUSES = new Set(['done', 'dismissed'])

function matchesFilter(status: string, filter: DelegationDeskFilter): boolean {
  if (filter === 'holding') return HOLDING_STATUSES.has(status)
  if (filter === 'ready') return READY_STATUSES.has(status)
  if (filter === 'delegated') return DELEGATED_STATUSES.has(status)
  if (filter === 'completed') return COMPLETED_STATUSES.has(status)
  return !COMPLETED_STATUSES.has(status)
}

function isTask(item: SpaceItem): boolean {
  return !item.doc_body
}

export function filterDelegationDeskItems(
  items: SpaceItem[],
  filter: DelegationDeskFilter,
  search: string,
): SpaceItem[] {
  const query = search.trim().toLocaleLowerCase()
  return items
    .filter(isTask)
    .filter((item) => matchesFilter(item.status, filter))
    .filter((item) => {
      if (!query) return true
      return `${item.title} ${item.description ?? ''}`.toLocaleLowerCase().includes(query)
    })
    .sort((left, right) =>
      (right.updated_at ?? right.created_at ?? '').localeCompare(
        left.updated_at ?? left.created_at ?? '',
      ),
    )
}

export function delegationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    inbox: 'Holding tank',
    processing: 'Organizing',
    ready_review: 'Ready to delegate',
    approved: 'Approved',
    dispatched: 'Delegated',
    in_progress: 'In progress',
    done: 'Done',
    blocked: 'Blocked',
    dismissed: 'Dismissed',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}

export function delegationStatusBadge(status: string): string {
  if (status === 'done' || status === 'dispatched' || status === 'in_progress') {
    return 'badge-glass-green'
  }
  if (status === 'ready_review' || status === 'approved') return 'badge-glass-purple'
  if (status === 'blocked') return 'badge-glass-red'
  if (status === 'processing') return 'badge-glass-blue'
  return 'badge-glass-muted'
}
