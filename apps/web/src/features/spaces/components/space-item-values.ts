import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

export type AssigneeFieldValue = Array<{ type: 'human' | 'agent'; id: string }>

/** Strip HTML tags for list cells / previews when `notes` stores TipTap / doc HTML. */
export function htmlToPlainTextPreview(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeAssigneeValue(next: unknown): AssigneeFieldValue {
  const raw = Array.isArray(next) ? next : typeof next === 'object' && next !== null ? [next] : []
  const out: AssigneeFieldValue = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const value = item as { type?: unknown; id?: unknown }
    const type = value.type === 'human' || value.type === 'agent' ? value.type : null
    const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : null
    if (!type || !id) continue
    const key = `${type}:${id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ type, id })
  }
  return out
}

export function readItemAssignees(item: SpaceItem): AssigneeFieldValue {
  const assignees = normalizeAssigneeValue(item.assignees)
  if (assignees.length > 0) return assignees
  if (item.assignee_type === 'human' || item.assignee_type === 'agent') {
    return normalizeAssigneeValue([{ type: item.assignee_type, id: item.assignee_id }])
  }
  return []
}

export function readFieldValue(item: SpaceItem, fieldId: string): unknown {
  switch (fieldId) {
    case 'title':
      return item.title
    case 'status':
      return item.status
    case 'priority':
      return item.priority
    case 'assignee':
      return readItemAssignees(item)
    case 'due_date':
      return item.due_date
    case 'start_date':
      return item.start_date
    case 'notes':
      return item.notes
    case 'description':
      return item.description
    case 'created_at':
      return item.created_at
    case 'updated_at':
      return item.updated_at
    case 'mission':
      return item.linked_mission_id
    default:
      return item.custom_data?.[fieldId]
  }
}

export function toFieldPatch(item: SpaceItem, fieldId: string, next: unknown): Partial<SpaceItem> {
  switch (fieldId) {
    case 'title':
      return { title: String(next ?? '') }
    case 'status':
      return { status: String(next ?? 'todo') as SpaceItem['status'] }
    case 'priority':
      return { priority: (next ? String(next) : null) as SpaceItem['priority'] }
    case 'assignee': {
      const assignees = normalizeAssigneeValue(next)
      const primary = assignees[0] ?? null
      return {
        assignees,
        assignee_type: primary?.type ?? 'unassigned',
        assignee_id: primary?.id ?? null,
      }
    }
    case 'due_date':
      return { due_date: (next as string | null) ?? null }
    case 'start_date':
      return { start_date: (next as string | null) ?? null }
    case 'notes':
      return { notes: (next as string | null) ?? null }
    case 'description':
      return { description: (next as string | null) ?? null }
    case 'mission':
      return {}
    default:
      return {
        custom_data: {
          ...(item.custom_data ?? {}),
          [fieldId]: next,
        },
      }
  }
}

const DRAFT_SEED: SpaceItem = {
  id: '00000000-0000-0000-0000-000000000001',
  space_id: '',
  org_id: '',
  user_id: '',
  title: '',
  status: 'todo',
  priority: null,
  assignee_type: 'unassigned',
  assignee_id: null,
  assignees: [],
  start_date: null,
  due_date: null,
  recurrence: null,
  description: null,
  parent_item_id: null,
  recurrence_parent_id: null,
  notes: null,
  doc_body: null,
  source: 'manual',
  linked_mission_id: null,
  form_id: null,
  task_execution_status: null,
  sort_order: 0,
  custom_data: {},
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  created_at: '1970-01-01T00:00:00.000Z',
  updated_at: '1970-01-01T00:00:00.000Z',
}

function isUnassignedAssignee(v: unknown): boolean {
  if (Array.isArray(v)) return normalizeAssigneeValue(v).length === 0
  return (
    typeof v === 'object' &&
    v !== null &&
    'type' in v &&
    (v as { type: string }).type === 'unassigned'
  )
}

export function fieldDraftsToCreateExtra(
  fieldValues: Record<string, unknown>,
  fieldDefs: FieldDef[],
): Record<string, unknown> {
  let item: SpaceItem = { ...DRAFT_SEED, custom_data: { ...DRAFT_SEED.custom_data } }
  for (const f of fieldDefs) {
    if (f.type === 'mission') continue
    const v = fieldValues[f.id]
    if (v === undefined) continue
    if (f.id === 'assignee' && isUnassignedAssignee(v)) continue
    if (f.id === 'priority' && (v == null || v === '')) continue
    if (f.id === 'due_date' && (v == null || v === '')) continue
    if (f.type === 'multi_select' && Array.isArray(v) && v.length === 0) continue
    const patch = toFieldPatch(item, f.id, v) as Partial<SpaceItem> & {
      custom_data?: Record<string, unknown>
    }
    const mergedCustom = { ...(item.custom_data ?? {}), ...(patch.custom_data ?? {}) }
    item = { ...item, ...patch, custom_data: mergedCustom } as SpaceItem
  }
  const rawStart = fieldValues['start_date']
  if (rawStart && typeof rawStart === 'string' && rawStart.length > 0) {
    item = { ...item, start_date: rawStart }
  }
  const extra: Record<string, unknown> = {}
  if (item.priority != null) extra.priority = item.priority
  if (item.assignee_type && item.assignee_type !== 'unassigned') {
    extra.assignee_type = item.assignee_type
    extra.assignee_id = item.assignee_id
    extra.assignees = item.assignees
  }
  if (item.due_date) extra.due_date = item.due_date
  if (item.start_date) extra.start_date = item.start_date
  if (Object.keys(item.custom_data ?? {}).length > 0) {
    extra.custom_data = item.custom_data
  }
  return extra
}

/** Human-readable task status for lists (matches schema option labels when available). */
export function formatSpaceTaskStatusLabel(statusId: string): string {
  switch (statusId) {
    case 'todo':
      return 'To do'
    case 'in_progress':
      return 'In progress'
    case 'in_review':
      return 'In review'
    case 'done':
      return 'Done'
    case 'archived':
      return 'Archived'
    default:
      return statusId
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((w) =>
          w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join(' ')
  }
}

/** Resolve status column text using space schema `status` field options when present. */
export function resolveStatusLabelFromId(
  statusId: string,
  statusField: FieldDef | null | undefined,
): string {
  const id = typeof statusId === 'string' && statusId.length > 0 ? statusId : 'todo'
  const fromSchema = statusField?.options?.find((o) => o.id === id)?.label
  if (fromSchema) return fromSchema
  return formatSpaceTaskStatusLabel(id)
}

export function resolveSpaceTaskStatusDisplay(
  item: SpaceItem,
  statusField: FieldDef | null | undefined,
): string {
  const raw = readFieldValue(item, 'status')
  const id = typeof raw === 'string' && raw.length > 0 ? raw : String(item.status ?? 'todo')
  return resolveStatusLabelFromId(id, statusField)
}

/** Color token / hex / gradient for `OptionDot` (aligned with schema status option color). */
const BUILTIN_SPACE_TASK_STATUS_DOT_COLOR: Record<string, string> = {
  todo: 'slate',
  in_progress: 'blue',
  in_review: 'amber',
  done: 'emerald',
  archived: 'slate',
}

const BUILTIN_MISSION_SUBTASK_STATUS_DOT_COLOR: Record<string, string> = {
  pending: 'slate',
  in_progress: 'amber',
  awaiting_human: 'orange',
  revision: 'violet',
  done: 'emerald',
  blocked: 'yellow',
  cancelled: 'slate',
}

export function resolveStatusDotColorFromId(
  statusId: string,
  statusField: FieldDef | null | undefined,
): string | undefined {
  const id = typeof statusId === 'string' && statusId.length > 0 ? statusId : 'todo'
  const fromSchema = statusField?.options?.find((o) => o.id === id)?.color
  if (fromSchema !== undefined && fromSchema !== '') return fromSchema
  return BUILTIN_SPACE_TASK_STATUS_DOT_COLOR[id]
}

export function resolveMissionSubtaskStatusDotColor(statusId: string): string | undefined {
  const id = typeof statusId === 'string' && statusId.length > 0 ? statusId : 'pending'
  return BUILTIN_MISSION_SUBTASK_STATUS_DOT_COLOR[id]
}

const BUILTIN_MISSION_STATUS_DOT_COLOR: Record<string, string> = {
  pending_approval: 'yellow',
  awaiting_access_approval: 'yellow',
}

export function resolveMissionStatusDotColor(statusId: string): string | undefined {
  const id = typeof statusId === 'string' && statusId.length > 0 ? statusId : 'inbox'
  return BUILTIN_MISSION_STATUS_DOT_COLOR[id]
}

export function resolveSpaceTaskStatusDotColor(
  item: SpaceItem,
  statusField: FieldDef | null | undefined,
): string | undefined {
  const raw = readFieldValue(item, 'status')
  const id = typeof raw === 'string' && raw.length > 0 ? raw : String(item.status ?? 'todo')
  return resolveStatusDotColorFromId(id, statusField)
}

/** Id + label for `application/x-vibey-artifact` when dragging space task rows into chat. */
export function buildSpaceTaskChatDragPayload(item: SpaceItem): { id: string; label: string } {
  const raw = readFieldValue(item, 'title')
  const label = (typeof raw === 'string' && raw.trim() ? raw.trim() : item.title?.trim()) || 'Task'
  return { id: item.id, label: label.slice(0, 500) }
}

/** Id + label for `application/x-vibey-artifact` when dragging Docs list/grid items into chat. */
export function buildSpaceDocChatDragPayload(item: SpaceItem): { id: string; label: string } {
  const label = (item.title?.trim() ? item.title.trim() : 'Untitled').slice(0, 500)
  return { id: item.id, label }
}
