export type MissionViewMode = 'list' | 'kanban'
export type MissionStatusFilter = 'all' | 'open' | 'done' | 'blocked' | 'failed' | 'archived'
export type MissionPriorityFilter = 'urgent' | 'high' | 'medium' | 'low'
export type MissionSort =
  | 'updated_at.desc'
  | 'updated_at.asc'
  | 'created_at.desc'
  | 'created_at.asc'
  | 'title.asc'
  | 'title.desc'
  | 'priority.desc'
  | 'priority.asc'

export type MissionToolbarDropdown = 'mobile-filter' | 'mobile-priority' | 'priority' | 'sort'

export interface MissionControlToolbarProps {
  statusFilter: MissionStatusFilter
  onStatusFilterChange: (status: MissionStatusFilter) => void
  priorityFilters: MissionPriorityFilter[]
  onPriorityFiltersChange: (priorities: MissionPriorityFilter[]) => void
  currentSort: MissionSort
  onSortChange: (sort: MissionSort) => void
  searchValue: string
  onSearchChange: (value: string) => void
  viewMode: MissionViewMode
  onViewModeChange: (mode: MissionViewMode) => void
}

export const STATUS_PILLS: { id: MissionStatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'failed', label: 'Failed' },
  { id: 'archived', label: 'Archived' },
]

export const PRIORITY_FILTERS: { id: MissionPriorityFilter; label: string }[] = [
  { id: 'urgent', label: 'Urgent' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
]

export const SORT_OPTIONS: {
  group: string
  options: { id: MissionSort; label: string; description: string }[]
}[] = [
  {
    group: 'Updated',
    options: [
      { id: 'updated_at.desc', label: 'Recently active', description: 'Last updated first' },
      { id: 'updated_at.asc', label: 'Least active', description: 'Oldest activity first' },
    ],
  },
  {
    group: 'Created',
    options: [
      { id: 'created_at.desc', label: 'Newest first', description: 'Most recently created' },
      { id: 'created_at.asc', label: 'Oldest first', description: 'Earliest created first' },
    ],
  },
  {
    group: 'Priority',
    options: [
      { id: 'priority.desc', label: 'Urgent first', description: 'Highest priority on top' },
      { id: 'priority.asc', label: 'Low first', description: 'Lowest priority on top' },
    ],
  },
  {
    group: 'Title',
    options: [
      { id: 'title.asc', label: 'A -> Z', description: 'Alphabetical order' },
      { id: 'title.desc', label: 'Z -> A', description: 'Reverse alphabetical' },
    ],
  },
]
