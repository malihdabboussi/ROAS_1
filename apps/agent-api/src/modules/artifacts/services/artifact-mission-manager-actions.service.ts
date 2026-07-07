import { Injectable } from '@nestjs/common'

export type MissionManagerContext = {
  getMission: (
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) => Promise<unknown>
  addMissionComment: (
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) => Promise<unknown>
  getMissionDeliverables: (
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) => Promise<unknown>
}

@Injectable()
export class ArtifactMissionManagerActionsService {
  async answerMissionQuestion(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    context: MissionManagerContext,
  ) {
    const mission = (await context.getMission(target, input, sessionKey)) as Record<string, unknown>
    const question = String(input.question ?? input.message ?? '').trim()
    const progress = String(mission.progress_notes ?? '').trim()
    const status = String(mission.status ?? 'unknown')
    return {
      success: true,
      reply: [
        question ? `Question: ${question}` : '',
        `Mission status: ${status}.`,
        progress ? `Current note: ${progress}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      mission,
    }
  }

  async summarizeMissionState(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    context: MissionManagerContext,
  ) {
    const mission = (await context.getMission(target, input, sessionKey)) as Record<string, unknown>
    const subtasks = Array.isArray(mission.subtasks) ? mission.subtasks : []
    const logs = Array.isArray(mission.logs) ? mission.logs : []
    return {
      success: true,
      summary: {
        id: mission.id,
        title: mission.title,
        status: mission.status,
        progress_notes: mission.progress_notes ?? null,
        subtask_count: subtasks.length,
        recent_event_count: logs.length,
      },
    }
  }

  async attachMissionContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    context: MissionManagerContext,
  ) {
    const message = String(input.message ?? input.context ?? '').trim()
    if (!message) return { success: false, error: 'message or context is required' }
    return context.addMissionComment(target, { ...input, message }, sessionKey)
  }

  async showMissionDeliverable(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    context: MissionManagerContext,
  ) {
    const deliverables = await context.getMissionDeliverables(target, input, sessionKey)
    const deliverableId = String(input.deliverable_id ?? '').trim()
    if (!deliverableId) return { success: true, deliverables }
    return {
      success: true,
      deliverable: Array.isArray(deliverables)
        ? (deliverables.find((d) => String((d as Record<string, unknown>).id) === deliverableId) ??
          null)
        : null,
    }
  }

  async createMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const rawSubtask =
      input.subtask && typeof input.subtask === 'object'
        ? (input.subtask as Record<string, unknown>)
        : input
    return this.managerAction(target, 'append-subtasks', input, sessionKey, {
      subtasks: [
        {
          id: String(rawSubtask.id ?? `new-${Date.now()}`),
          title: String(rawSubtask.title ?? '').trim(),
          assignTo: String(rawSubtask.assignTo ?? rawSubtask.assigned_agent_key ?? 'vibey'),
          dependsOn: Array.isArray(rawSubtask.dependsOn) ? rawSubtask.dependsOn : [],
          intent:
            rawSubtask.intent && typeof rawSubtask.intent === 'object'
              ? rawSubtask.intent
              : {
                  why: 'Mission manager created this follow-up subtask.',
                  story: 'The user expects Vibey to keep the mission moving.',
                  sensory: 'The mission feels actively managed instead of stuck.',
                  endState: 'The requested follow-up work is queued for execution.',
                  ecology: 'This subtask must fit the current mission plan and existing outputs.',
                },
        },
      ],
    })
  }

  async editMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const subtaskId = String(input.subtask_id ?? '').trim()
    if (!subtaskId) return { success: false, error: 'subtask_id is required' }
    return this.managerAction(target, 'edit-subtask', input, sessionKey, {
      subtask_id: subtaskId,
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(typeof input.assigned_agent_key === 'string'
        ? { assigned_agent_key: input.assigned_agent_key }
        : {}),
      ...(input.intent && typeof input.intent === 'object' ? { intent: input.intent } : {}),
    })
  }

  async cancelMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const subtaskId = String(input.subtask_id ?? '').trim()
    if (!subtaskId) return { success: false, error: 'subtask_id is required' }
    return this.managerAction(target, 'cancel-subtask', input, sessionKey, {
      subtask_id: subtaskId,
    })
  }

  async retryMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const subtaskId = String(input.subtask_id ?? '').trim()
    if (!subtaskId) return { success: false, error: 'subtask_id is required' }
    return this.managerAction(target, 'retry-subtask', input, sessionKey, { subtask_id: subtaskId })
  }

  async reassignMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const subtaskId = String(input.subtask_id ?? '').trim()
    const assignedAgentKey = String(input.assigned_agent_key ?? input.assignTo ?? '').trim()
    if (!subtaskId) return { success: false, error: 'subtask_id is required' }
    if (!assignedAgentKey) return { success: false, error: 'assigned_agent_key is required' }
    return this.managerAction(target, 'edit-subtask', input, sessionKey, {
      subtask_id: subtaskId,
      assigned_agent_key: assignedAgentKey,
    })
  }

  async prepareMissionReplan(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.managerAction(target, 'prepare-replan', input, sessionKey, {
      reason:
        typeof input.reason === 'string' ? input.reason : 'Vibey mission manager requested replan.',
    })
  }

  async approveMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('PATCH', `/api/missions/${missionId}/status`, sessionKey, {
      status: 'done',
    })
  }

  private requireMissionId(input: Record<string, unknown>): string {
    const missionId = (input.mission_id as string) ?? ''
    if (!missionId) throw new Error('mission_id is required')
    return missionId
  }

  private resolveMissionActionIdentity(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): { missionId: string; userId: string; orgId: string | null } {
    const missionId = this.requireMissionId(input)
    const userId =
      (typeof input.user_id === 'string' && input.user_id.trim()) ||
      (typeof target.parseUserId === 'function' ? target.parseUserId(sessionKey) : '') ||
      (typeof target.resolveUserId === 'function' ? target.resolveUserId(sessionKey) : '')
    if (!userId) throw new Error('user_id is required')
    const orgId =
      typeof input.org_id === 'string'
        ? input.org_id
        : typeof target.resolveOrgId === 'function'
          ? (target.resolveOrgId(sessionKey) ?? null)
          : null
    return { missionId, userId, orgId }
  }

  private async managerAction(
    target: Record<string, any>,
    path: string,
    input: Record<string, unknown>,
    sessionKey?: string,
    extra?: Record<string, unknown>,
  ) {
    const { missionId, userId, orgId } = this.resolveMissionActionIdentity(
      target,
      input,
      sessionKey,
    )
    return target.mainApiCall('POST', `/api/internal/missions/manager/${path}`, sessionKey, {
      mission_id: missionId,
      user_id: userId,
      org_id: orgId,
      ...extra,
      idempotency_key:
        typeof input.idempotency_key === 'string'
          ? input.idempotency_key
          : `mission-manager:${path}:${missionId}:${Date.now()}`,
    })
  }
}
