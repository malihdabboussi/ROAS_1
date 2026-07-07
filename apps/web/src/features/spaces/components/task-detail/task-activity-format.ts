import type { TeamRosterEntry } from '@/lib/team'
import { formatAssigneeChangeActivityLabel } from '../../lib/format-assignee-change-activity'
import {
  formatFieldChangeActivityLabel,
  formatStatusChangeActivityLabel,
} from '../../lib/format-field-change-activity'
import type { FieldDef } from '../../types/space-schema'
import {
  formatFileFieldActivityLabel,
  formatUrlFieldActivityLabel,
} from './TaskActivityFilePreview'
import type { ActivityMeta, TaskActivityMetaArgs } from './task-activity-types'

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  notes: 'Notes',
  priority: 'Priority',
  status: 'Status',
  start_date: 'Start date',
  due_date: 'Due date',
  sort_order: 'Order',
  parent_item_id: 'Parent task',
  recurrence: 'Recurrence',
  assignee_type: 'Assignee',
  assignee_id: 'Assignee',
  assignees: 'Assignees',
  tags: 'Tags',
  currency: 'Currency',
}

export function buildRosterAvatarsMap(roster: TeamRosterEntry[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of roster) {
    if (!e.avatar_url) continue
    if (e.kind === 'human' && e.user_id) map.set(e.user_id, e.avatar_url)
    if (e.kind === 'agent' && e.agent_key) map.set(e.agent_key, e.avatar_url)
  }
  return map
}

export function resolveActivityMeta({
  entry,
  currentUserId,
  roster,
  rosterAvatars,
  authDisplayName,
  authAvatarUrl,
}: TaskActivityMetaArgs): ActivityMeta {
  const et = entry.event_type
  if (et === 'automation_comment' || et === 'automation_action') {
    return {
      label: 'Flow',
      senderLabel: 'Flow',
      avatarUrl: null,
      isAgent: false,
      isSystem: true,
    }
  }
  if (et === 'agent_task_execution') {
    const key = (entry.payload.agent_key as string) ?? 'Agent'
    const display =
      roster.find((r) => r.kind === 'agent' && r.agent_key === key)?.display_name ?? key
    return {
      label: display,
      senderLabel: display,
      avatarUrl: rosterAvatars.get(key) ?? null,
      isAgent: true,
      isSystem: false,
    }
  }
  if (entry.source === 'agent' || entry.agent_key) {
    const key = entry.agent_key ?? (entry.payload.agent_key as string) ?? 'Agent'
    const display =
      roster.find((r) => r.kind === 'agent' && r.agent_key === key)?.display_name ?? String(key)
    return {
      label: display,
      senderLabel: display,
      avatarUrl: key ? (rosterAvatars.get(String(key)) ?? null) : null,
      isAgent: true,
      isSystem: false,
    }
  }
  if (et.startsWith('mission.')) {
    const key = entry.agent_key ?? (entry.payload.agent_key as string) ?? 'Agent'
    const display = key
      ? (roster.find((r) => r.kind === 'agent' && r.agent_key === key)?.display_name ?? key)
      : 'Agent'
    return {
      label: display,
      senderLabel: display,
      avatarUrl: key ? (rosterAvatars.get(String(key)) ?? null) : null,
      isAgent: true,
      isSystem: false,
    }
  }
  const uid = entry.user_id
  if (uid) {
    const h = roster.find((r) => r.kind === 'human' && r.user_id === uid)
    const isMe = currentUserId != null && uid === currentUserId
    const fromRoster = h?.display_name?.trim()
    const name =
      (fromRoster && fromRoster.length > 0 ? fromRoster : '') ||
      (isMe && authDisplayName.trim() ? authDisplayName.trim() : '') ||
      'Member'
    return {
      label: isMe ? 'You' : name,
      senderLabel: name,
      avatarUrl: rosterAvatars.get(uid) ?? (isMe ? authAvatarUrl : null) ?? null,
      isAgent: false,
      isSystem: false,
    }
  }
  const meName =
    (currentUserId
      ? roster.find((r) => r.kind === 'human' && r.user_id === currentUserId)?.display_name?.trim()
      : null) ||
    authDisplayName.trim() ||
    null
  return {
    label: 'You',
    senderLabel: meName || 'User',
    avatarUrl: currentUserId ? (rosterAvatars.get(currentUserId) ?? authAvatarUrl ?? null) : null,
    isAgent: false,
    isSystem: false,
  }
}

export function formatEventLabel(
  eventType: string,
  payload: Record<string, unknown> | undefined,
  roster: TeamRosterEntry[],
  allFields: FieldDef[],
): string {
  if (eventType === 'field_change' && payload?.field) {
    const fieldId = String(payload.field)
    const resolveFieldLabel = (id: string) =>
      FIELD_LABELS[id] ?? id.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const urlLabel = formatUrlFieldActivityLabel(payload, resolveFieldLabel)
    if (urlLabel) return urlLabel
    const fileLabel = formatFileFieldActivityLabel(payload, resolveFieldLabel)
    if (fileLabel) return fileLabel
    const typedLabel = formatFieldChangeActivityLabel(payload, allFields, resolveFieldLabel)
    if (typedLabel) return typedLabel
    return `updated ${resolveFieldLabel(fieldId)}`
  }
  if (eventType === 'status_change') {
    return formatStatusChangeActivityLabel(payload, allFields)
  }
  if (eventType === 'assignee_change') {
    return formatAssigneeChangeActivityLabel(payload, roster)
  }
  if (eventType === 'automation_action') {
    const summary = typeof payload?.summary === 'string' ? payload.summary.trim() : ''
    return summary || 'ran flow action'
  }
  if (eventType === 'created' && payload?.source === 'form') {
    return 'Form submission'
  }
  const labels: Record<string, string> = {
    comment: 'Comment',
    'user.comment': 'Comment',
    automation_comment: 'Flow',
    automation_action: 'Flow action',
    agent_task_execution: 'Agent working',
    created: 'Task created',
    added_subtask: 'Subtask added',
    deleted_subtask: 'Subtask removed',
    'mission.created': 'Mission created',
    'mission.progress': 'Progress update',
    'mission.execution.started': 'Execution started',
    'mission.execution.completed': 'Execution completed',
    'mission.step.completed': 'Step completed',
    'mission.failed': 'Failed',
    'mission.status.updated': 'Status updated',
    'mission.plan.pending_approval': 'Awaiting plan approval',
    'mission.plan.approved': 'Plan approved',
    'mission.plan.rejected': 'Plan rejected',
  }
  return labels[eventType] ?? eventType.replace(/[._]/g, ' ')
}

export function formatActivityDetail(entry: {
  event_type: string
  payload: Record<string, unknown>
}): string | null {
  const p = entry.payload
  if (!p || typeof p !== 'object') return null
  if (entry.event_type === 'automation_action') {
    const status = String((p as Record<string, unknown>).status ?? '')
    const error = (p as Record<string, unknown>).error
    const automationName = String((p as Record<string, unknown>).automation_name ?? '').trim()
    const duration = (p as Record<string, unknown>).duration_ms
    const parts: string[] = []
    if (automationName) parts.push(automationName)
    if (status === 'failed' && typeof error === 'string' && error.trim()) {
      parts.push(error.trim())
    }
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      parts.push(`${Math.max(1, Math.round(duration / 1000))}s`)
    }
    return parts.length > 0 ? parts.join(' • ') : null
  }
  const raw = (p as Record<string, unknown>).detail ?? (p as Record<string, unknown>).summary
  if (typeof raw === 'string' && raw.trim()) return raw
  return null
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}
