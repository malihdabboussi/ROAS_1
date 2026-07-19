import type { MissionJobData } from '../types'

export type OutboxEventRow = {
  id: string
  event_type: string
  mission_id: string
  user_id: string
  org_id?: string | null
  dedupe_key: string
  payload: Record<string, unknown> | null
  attempts: number
  max_attempts: number
  priority_rank?: number
}

export const DISPATCHABLE_MISSION_STATUSES = new Set([
  'inbox',
  'planning',
  'todo',
  'in_progress',
  'review',
])

/** mission.subtask.* — execute/triage must dispatch when mission is blocked/error/failed too */
export const SUBTASK_DISPATCHABLE_MISSION_STATUSES = new Set([
  'inbox',
  'planning',
  'todo',
  'in_progress',
  'review',
  'awaiting_access_approval',
  'blocked',
  'error',
  'failed',
])

/** mission.comment.directive — user comments can arrive in more mission states */
export const DIRECTIVE_DISPATCHABLE_MISSION_STATUSES = new Set([
  'inbox',
  'planning',
  'pending_approval',
  'todo',
  'in_progress',
  'review',
  'blocked',
  'error',
  'failed',
  'done',
  'backlog',
])

export function allowedStatusesForOutboxEvent(eventType: string): Set<string> {
  if (eventType === 'mission.comment.directive') return DIRECTIVE_DISPATCHABLE_MISSION_STATUSES
  if (eventType.startsWith('mission.subtask.')) return SUBTASK_DISPATCHABLE_MISSION_STATUSES
  return DISPATCHABLE_MISSION_STATUSES
}

export function mapOutboxEventToJob(row: OutboxEventRow): {
  jobId: string
  data: MissionJobData
  priorityRank: number
} | null {
  const payload = row.payload || {}
  const correlationId =
    typeof payload.correlation_id === 'string' ? payload.correlation_id : row.dedupe_key

  const rank = row.priority_rank ?? 3

  if (row.event_type === 'mission.plan.requested') {
    return {
      jobId: `outbox-${row.id}-plan`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'plan',
        priorityRank: rank,
      },
    }
  }

  if (row.event_type === 'mission.review.requested') {
    return {
      jobId: `outbox-${row.id}-review`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'review',
        priorityRank: rank,
      },
    }
  }

  if (row.event_type === 'mission.execute.requested') {
    return {
      jobId: `outbox-${row.id}-execute`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'execute',
        priorityRank: rank,
      },
    }
  }

  if (row.event_type === 'mission.subtask.execute.requested') {
    const subtaskId =
      typeof payload.subtask_id === 'string'
        ? payload.subtask_id
        : typeof payload.subtaskId === 'string'
          ? payload.subtaskId
          : ''
    if (!subtaskId) {
      throw new Error(`Outbox event ${row.id} missing subtask_id`)
    }

    return {
      jobId: `outbox-${row.id}-subtask-${subtaskId}`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'execute',
        subtaskId,
        priorityRank: rank,
      },
    }
  }

  if (row.event_type === 'mission.subtask.triage.requested') {
    const subtaskId =
      typeof payload.subtask_id === 'string'
        ? payload.subtask_id
        : typeof payload.subtaskId === 'string'
          ? payload.subtaskId
          : ''
    if (!subtaskId) {
      throw new Error(`Outbox event ${row.id} missing subtask_id for triage`)
    }

    return {
      jobId: `outbox-${row.id}-triage-${subtaskId}`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'triage',
        subtaskId,
        priorityRank: rank,
      },
    }
  }

  if (row.event_type === 'mission.comment.directive') {
    const commentId =
      typeof payload.comment_id === 'string'
        ? payload.comment_id
        : typeof payload.commentId === 'string'
          ? payload.commentId
          : ''
    const commentMessage =
      typeof payload.comment_message === 'string'
        ? payload.comment_message
        : typeof payload.commentMessage === 'string'
          ? payload.commentMessage
          : ''
    const fromStatus =
      typeof payload.from_status === 'string'
        ? payload.from_status
        : typeof payload.fromStatus === 'string'
          ? payload.fromStatus
          : undefined

    return {
      jobId: `outbox-${row.id}-directive`,
      priorityRank: rank,
      data: {
        missionId: row.mission_id,
        userId: row.user_id,
        orgId: row.org_id ?? null,
        correlationId,
        phase: 'directive',
        commentId: commentId || undefined,
        commentMessage: commentMessage || undefined,
        fromStatus,
        priorityRank: rank,
      },
    }
  }

  return null
}
