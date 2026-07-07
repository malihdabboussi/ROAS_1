import type { MissionGroupBy } from '../types/space-schema'

/** Single source for missions “Group by” field labels (strip + customize panel). */
export const MISSION_GROUP_BY_OPTIONS: { id: MissionGroupBy; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'created_at', label: 'Created' },
  { id: 'updated_at', label: 'Updated' },
]
