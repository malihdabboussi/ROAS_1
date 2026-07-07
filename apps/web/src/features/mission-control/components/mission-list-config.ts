import type { MissionColumnId, FieldDef } from '@/lib/spaces/space-schema-types'
import type { SubtaskStatus } from '../types'

/** Same labels / flag colors as list `SelectCell` (DEFAULT_SPACE_SCHEMA `priority` field). */
export const MISSION_LIST_PRIORITY_FIELD: FieldDef = {
  id: 'priority',
  name: 'Priority',
  type: 'select',
  system: true,
  required: true,
  options: [
    { id: 'low', label: 'Low', color: 'slate' },
    { id: 'medium', label: 'Medium', color: 'blue' },
    { id: 'high', label: 'High', color: 'orange' },
    { id: 'urgent', label: 'Urgent', color: 'red' },
  ],
}

/** Default columns (no campaign - space is already scoped to one campaign). */
export const DEFAULT_COLUMNS: MissionColumnId[] = [
  'title',
  'assigned',
  'working',
  'status',
  'progress',
  'updated',
]

export interface ColumnConfig {
  id: MissionColumnId
  label: string
  fraction: string
}

export function normalizeMissionColumnOrder(ids: MissionColumnId[]): MissionColumnId[] {
  if (ids.includes('title')) {
    return ['title', ...ids.filter((id) => id !== 'title')]
  }
  return ids
}

export const COLUMN_DEFS: ColumnConfig[] = [
  { id: 'title', label: 'Title', fraction: '2fr' },
  { id: 'priority', label: 'Priority', fraction: '0.6fr' },
  { id: 'campaign', label: 'Campaign', fraction: '1fr' },
  { id: 'assigned', label: 'Assigned', fraction: '1fr' },
  { id: 'working', label: 'Working', fraction: '0.88fr' },
  { id: 'status', label: 'Status', fraction: '0.95fr' },
  { id: 'progress', label: 'Progress', fraction: '0.72fr' },
  { id: 'documents', label: 'Documents', fraction: '0.6fr' },
  { id: 'media', label: 'Media', fraction: '0.5fr' },
  { id: 'artifacts', label: 'Artifacts', fraction: '0.6fr' },
  { id: 'updated', label: 'Updated', fraction: '0.55fr' },
  { id: 'created', label: 'Created', fraction: '0.55fr' },
]

/** Default px widths for Spaces list resize (aligned with `DraggableColumnHeaders` scale). */
export const MISSION_LIST_DEFAULT_COL_PX: Record<MissionColumnId, number> = {
  title: 380,
  priority: 112,
  campaign: 160,
  assigned: 148,
  working: 128,
  status: 120,
  progress: 116,
  documents: 96,
  media: 88,
  artifacts: 96,
  updated: 104,
  created: 104,
  subtasks: 100,
}

export const MIN_MISSION_RESIZE_COL = 60
export const MIN_MISSION_RESIZE_TITLE = 320

export const STATUS_STYLE: Record<string, string> = {
  inbox: 'bg-slate-500/15 text-slate-300',
  backlog: 'bg-violet-500/15 text-violet-300',
  planning: 'bg-indigo-500/15 text-indigo-300',
  pending_approval: 'bg-orange-500/15 text-orange-300',
  awaiting_access_approval: 'bg-orange-500/15 text-orange-300',
  todo: 'bg-cyan-500/15 text-cyan-300',
  in_progress: 'bg-amber-500/15 text-amber-400',
  review: 'bg-violet-500/15 text-violet-300',
  blocked: 'bg-yellow-500/15 text-yellow-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  archived: 'bg-zinc-500/15 text-zinc-400',
  error: 'bg-red-500/15 text-red-400',
  failed: 'bg-red-700/20 text-red-300',
  dead_letter: 'bg-red-700/20 text-red-300',
}

export const SUBTASK_STATUS_STYLE: Record<SubtaskStatus, string> = {
  pending: 'bg-slate-500/15 text-slate-300',
  in_progress: 'bg-amber-500/15 text-amber-400',
  awaiting_human: 'bg-orange-500/15 text-orange-300',
  done: 'bg-emerald-500/15 text-emerald-400',
  revision: 'bg-violet-500/15 text-violet-300',
  blocked: 'bg-yellow-500/15 text-yellow-400',
  cancelled: 'bg-zinc-500/15 text-zinc-400',
}

export const SUBTASK_STATUS_LABEL: Record<SubtaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  awaiting_human: 'Awaiting you',
  done: 'Done',
  revision: 'Revision',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
}

export const STATUS_LABEL: Record<string, string> = {
  inbox: 'Inbox',
  backlog: 'Backlog',
  planning: 'Planning',
  pending_approval: 'Pending Approval',
  awaiting_access_approval: 'Access Needed',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
  archived: 'Archived',
  error: 'Error',
  failed: 'Failed',
  dead_letter: 'Failed',
}

/** Matches `TimestampCell` list mode (`formatShort`). */
export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTooltip(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isMissionFailedStatus(status: string): boolean {
  return status === 'error' || status === 'failed' || status === 'dead_letter'
}
