import type { MeetingAction } from '@/features/home/services/meeting-workspace-api'
import type { TaskRollupItem } from '@/lib/tasks'

const DONE_STATUSES = new Set(['done', 'complete', 'completed', 'resolved'])

function asAssignees(
  value: MeetingAction['assignees'],
): Array<{ type: 'human' | 'agent'; id: string }> {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is { type: 'human' | 'agent'; id: string } =>
      !!entry &&
      (entry.type === 'human' || entry.type === 'agent') &&
      typeof entry.id === 'string' &&
      entry.id.trim().length > 0,
  )
}

function listStatus(action: MeetingAction): string {
  const taskStatus = action.task_status?.trim()
  if (taskStatus) return taskStatus
  return DONE_STATUSES.has(action.status.trim().toLowerCase()) ? 'done' : 'logged'
}

function sourceOf(action: MeetingAction): TaskRollupItem['source'] {
  if (action.source_type === 'provider') return 'fathom'
  if (action.source_type === 'ai') return 'agent_suggested'
  return 'manual'
}

function asPriority(value: string | null | undefined): TaskRollupItem['priority'] {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'urgent') return value
  return null
}

export function meetingActionToTaskRollupItem(
  action: MeetingAction,
  context: { spaceId: string; spaceTitle: string; campaignName: string | null },
): TaskRollupItem {
  const assignees = asAssignees(action.assignees)
  const assigneeId = action.assignee_id?.trim() || assignees[0]?.id || null
  return {
    id: action.id,
    title: action.title,
    status: listStatus(action),
    priority: asPriority(action.priority),
    due_at: action.due_at ?? null,
    start_date: action.start_date ?? null,
    assignee_type:
      action.assignee_type === 'human' || action.assignee_type === 'agent'
        ? action.assignee_type
        : assigneeId
          ? 'human'
          : 'unassigned',
    assignee_id: assigneeId,
    assignee_user_id: assigneeId,
    assignees,
    space_id: context.spaceId,
    space_title: context.spaceTitle,
    campaign_id: null,
    campaign_name: context.campaignName,
    program_id: null,
    program_name: null,
    source_url: `/spaces?space=${context.spaceId}&item=${action.id}`,
    description: action.description ?? null,
    notes: action.notes ?? null,
    source: sourceOf(action),
    linked_mission_id: action.linked_mission_id ?? null,
    org_id: action.org_id ?? undefined,
    user_id: action.user_id ?? undefined,
    sort_order: action.sort_order ?? 0,
    created_at: action.created_at ?? new Date(0).toISOString(),
    updated_at: action.updated_at ?? null,
  }
}
