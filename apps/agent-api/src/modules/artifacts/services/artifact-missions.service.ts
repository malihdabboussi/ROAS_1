import { Injectable } from '@nestjs/common'
import { ArtifactMissionsRepository } from '../repositories/artifact-missions.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import {
  inferCapabilityDomain,
  resolveCapabilityPolicy,
  type ArtifactAgentRecord,
  type ArtifactCapabilityPolicy,
} from './artifact-capability.policy'
import { ArtifactMissionApiActionsService } from './artifact-mission-api-actions.service'
import {
  ArtifactMissionManagerActionsService,
  type MissionManagerContext,
} from './artifact-mission-manager-actions.service'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'
@Injectable()
export class ArtifactMissionsService {
  constructor(
    private readonly repository: ArtifactMissionsRepository = new ArtifactMissionsRepository(),
    private readonly managerActions: ArtifactMissionManagerActionsService = new ArtifactMissionManagerActionsService(),
    private readonly apiActions: ArtifactMissionApiActionsService = new ArtifactMissionApiActionsService(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      create_mission: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'createMission',
          () => this.createMission(target, data, sessionKey),
          data,
          sessionKey,
        ),
      list_missions: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'listMissions',
          () => this.listMissions(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_mission: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getMission',
          () => this.getMission(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_mission_deliverables: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getMissionDeliverables',
          () => this.apiActions.getMissionDeliverables(target, data, sessionKey),
          data,
          sessionKey,
        ),
      compile_webinar_launch_bible: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'compileWebinarLaunchBible',
          () => this.apiActions.compileWebinarLaunchBible(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_mission: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateMission',
          () => this.updateMission(target, data, sessionKey),
          data,
          sessionKey,
        ),
      add_mission_comment: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'addMissionComment',
          () => this.apiActions.addMissionComment(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_mission_plan: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getMissionPlan',
          () => this.apiActions.getMissionPlan(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_mission_logs: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getMissionLogs',
          () => this.apiActions.getMissionLogs(target, data, sessionKey),
          data,
          sessionKey,
        ),
      list_mission_subtasks: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'listMissionSubtasks',
          () => this.apiActions.listMissionSubtasks(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_mission_subtask: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateMissionSubtask',
          () => this.apiActions.updateMissionSubtask(target, data, sessionKey),
          data,
          sessionKey,
        ),
      retry_mission: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'retryMission',
          () => this.apiActions.retryMission(target, data, sessionKey),
          data,
          sessionKey,
        ),
      trash_mission: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'trashMission',
          () => this.apiActions.trashMission(target, data, sessionKey),
          data,
          sessionKey,
        ),
      answer_mission_question: (data, sessionKey) =>
        this.managerActions.answerMissionQuestion(
          target,
          data,
          sessionKey,
          this.getManagerContext(),
        ),
      summarize_mission_state: (data, sessionKey) =>
        this.managerActions.summarizeMissionState(
          target,
          data,
          sessionKey,
          this.getManagerContext(),
        ),
      attach_mission_context: (data, sessionKey) =>
        this.managerActions.attachMissionContext(
          target,
          data,
          sessionKey,
          this.getManagerContext(),
        ),
      show_mission_deliverable: (data, sessionKey) =>
        this.managerActions.showMissionDeliverable(
          target,
          data,
          sessionKey,
          this.getManagerContext(),
        ),
      create_mission_subtask: (data, sessionKey) =>
        this.managerActions.createMissionSubtask(target, data, sessionKey),
      edit_mission_subtask: (data, sessionKey) =>
        this.managerActions.editMissionSubtask(target, data, sessionKey),
      cancel_mission_subtask: (data, sessionKey) =>
        this.managerActions.cancelMissionSubtask(target, data, sessionKey),
      retry_mission_subtask: (data, sessionKey) =>
        this.managerActions.retryMissionSubtask(target, data, sessionKey),
      reassign_mission_subtask: (data, sessionKey) =>
        this.managerActions.reassignMissionSubtask(target, data, sessionKey),
      prepare_mission_replan: (data, sessionKey) =>
        this.managerActions.prepareMissionReplan(target, data, sessionKey),
      approve_mission: (data, sessionKey) =>
        this.managerActions.approveMission(target, data, sessionKey),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private requireMissionId(input: Record<string, unknown>): string {
    const missionId = (input.mission_id as string) ?? ''
    if (!missionId) throw new Error('mission_id is required')
    return missionId
  }

  private getManagerContext(): MissionManagerContext {
    return {
      getMission: (target, input, sessionKey) => this.getMission(target, input, sessionKey),
      addMissionComment: (target, input, sessionKey) =>
        this.apiActions.addMissionComment(target, input, sessionKey),
      getMissionDeliverables: (target, input, sessionKey) =>
        this.apiActions.getMissionDeliverables(target, input, sessionKey),
    }
  }

  private async indexSpaceSource(
    target: Record<string, any>,
    input: {
      sourceType: 'mission' | 'mission_subtask' | 'mission_deliverable'
      sourceId: string
      userId: string
      orgId?: string | null
    },
  ): Promise<void> {
    const indexer = target.spaceAssetIndexService as
      | {
          indexSource: (client: any, payload: typeof input) => Promise<unknown>
        }
      | undefined
    if (!indexer) return
    await indexer.indexSource(target.serviceClient, input)
  }

  private async resolveVisibilityAgentKeys(
    target: Record<string, any>,
    sessionKey?: string,
  ): Promise<string[] | null> {
    if (!sessionKey) return null
    const callerKey = target.parseAgentIdFromSessionKey(sessionKey) as string | null
    if (!callerKey || callerKey === 'default' || callerKey === 'vibey') return null

    const userId = target.parseUserId(sessionKey) as string | null
    if (!userId) return null

    const visOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data: agentRow } = await this.repository.findVisibilityAgent(target.serviceClient, {
      userId,
      agentKey: callerKey,
      orgId: visOrgId,
    })
    if (!agentRow) return null

    const policy = resolveCapabilityPolicy(agentRow as ArtifactAgentRecord)
    if (!policy) return [callerKey]

    if (policy.profile === 'vibey_ceo') {
      return null
    }

    if (policy.level === 'c_level' || policy.level === 'system') return null

    if (policy.level === 'manager' && policy.domain === 'operations') return null

    if (policy.level === 'manager') {
      return this.resolveAgentKeysForDomain(target, userId, policy, visOrgId)
    }

    return [callerKey]
  }

  private async resolveAgentKeysForDomain(
    target: Record<string, any>,
    userId: string,
    policy: ArtifactCapabilityPolicy,
    orgId?: string | null,
  ): Promise<string[]> {
    const { data: allAgents } = await this.repository.listVisibilityAgents(target.serviceClient, {
      userId,
      orgId,
    })
    if (!allAgents || allAgents.length === 0) return []

    return (
      allAgents as Array<{ agent_key: string; role?: string; config?: Record<string, unknown> }>
    )
      .filter((a) => {
        const explicitDomain = a.config?.capability_domain as string | undefined
        const domain = explicitDomain || inferCapabilityDomain(a.agent_key, a.role)
        return domain === policy.domain
      })
      .map((a) => a.agent_key)
  }

  private async createMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const payload: Record<string, unknown> = {}
    const title = (input.title as string) ?? ''
    if (!title.trim()) return { success: false, error: 'title is required' }
    payload.title = title
    payload.idempotency_key =
      typeof input.idempotency_key === 'string' && input.idempotency_key.trim()
        ? input.idempotency_key.trim()
        : crypto.randomUUID()

    for (const key of [
      'brief',
      'description',
      'priority',
      'assigned_agent_key',
      'parent_mission_id',
      'campaign_id',
      'space_id',
      'source_space_item_id',
    ]) {
      if (input[key] !== undefined) payload[key] = input[key]
    }

    const missionInput =
      input.input && typeof input.input === 'object' && !Array.isArray(input.input)
        ? { ...(input.input as Record<string, unknown>) }
        : {}
    const playbookId = typeof input.playbook_id === 'string' ? input.playbook_id.trim() : ''
    if (playbookId) missionInput.playbook_id = playbookId
    if (input.input !== undefined || playbookId) payload.input = missionInput

    const result = (await target.mainApiCall(
      'POST',
      '/api/missions',
      sessionKey,
      payload,
    )) as Record<string, unknown>
    const missionId = typeof result?.id === 'string' ? result.id : null
    if (missionId) {
      const spaceId =
        getActiveSpaceId(input) ??
        (typeof result.space_id === 'string' && result.space_id.trim().length > 0
          ? result.space_id
          : null)
      const campaignId =
        typeof result.campaign_id === 'string' && result.campaign_id.trim().length > 0
          ? result.campaign_id
          : typeof payload.campaign_id === 'string' && payload.campaign_id.trim().length > 0
            ? payload.campaign_id
            : null
      await ensureSpaceView({
        supabase: target.serviceClient,
        spaceId,
        campaignId,
        viewType: 'missions',
        logger: target.logger,
      })
      const userId = target.resolveUserId(sessionKey)
      const orgId =
        typeof target.resolveOrgId === 'function'
          ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
          : null
      await this.indexSpaceSource(target, {
        sourceType: 'mission',
        sourceId: missionId,
        userId,
        orgId,
      })
    }
    return result
  }

  private async listMissions(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const agentKeys = await this.resolveVisibilityAgentKeys(target, sessionKey)

    if (sessionKey && target.isMissionSessionKey(sessionKey)) {
      const userId = target.parseUserId(sessionKey)
      if (!userId) throw new Error('Invalid mission session key: missing user id')

      if (agentKeys && agentKeys.length > 0) {
        const resolvedLimit =
          typeof input.limit === 'number'
            ? input.limit
            : typeof input.limit === 'string'
              ? Number.parseInt(input.limit, 10)
              : 30
        const limit = Number.isFinite(resolvedLimit) && resolvedLimit > 0 ? resolvedLimit : 30

        const { data: directMatches, error } = await this.repository.listVisibleMissions(
          target.serviceClient,
          {
            userId,
            agentKeys,
            status:
              typeof input.status === 'string' && input.status.trim().length > 0
                ? input.status
                : undefined,
            campaignId:
              typeof input.campaign_id === 'string' && input.campaign_id.trim().length > 0
                ? input.campaign_id
                : undefined,
            limit,
          },
        )
        if (error) throw new Error(`Failed to list missions: ${error.message}`)

        const { data: subtaskMissionIds } = await this.repository.listAssignedSubtaskMissionIds(
          target.serviceClient,
          {
            userId,
            agentKeys,
          },
        )
        const directIds = new Set((directMatches || []).map((m) => String(m.id)))
        const extraIds = (subtaskMissionIds || [])
          .map((r) => r.mission_id)
          .filter((id) => !directIds.has(id))

        if (extraIds.length === 0) return directMatches || []

        const { data: extraMissions } = await this.repository.listMissionsByIds(
          target.serviceClient,
          { userId, missionIds: extraIds },
        )
        const merged = [...(directMatches || []), ...(extraMissions || [])]
        merged.sort((a, b) =>
          String(b.updated_at) > String(a.updated_at)
            ? 1
            : String(b.updated_at) < String(a.updated_at)
              ? -1
              : 0,
        )
        return merged.slice(0, 30)
      }

      const resolvedLimit =
        typeof input.limit === 'number'
          ? input.limit
          : typeof input.limit === 'string'
            ? Number.parseInt(input.limit, 10)
            : 30
      const limit = Number.isFinite(resolvedLimit) && resolvedLimit > 0 ? resolvedLimit : 30

      const { data, error } = await this.repository.listUserMissions(target.serviceClient, {
        userId,
        status:
          typeof input.status === 'string' && input.status.trim().length > 0
            ? input.status
            : undefined,
        campaignId:
          typeof input.campaign_id === 'string' && input.campaign_id.trim().length > 0
            ? input.campaign_id
            : undefined,
        limit,
      })
      if (error) throw new Error(`Failed to list missions: ${error.message}`)
      return data || []
    }

    const search = new URLSearchParams()
    if (typeof input.status === 'string' && input.status.trim().length > 0) {
      search.set('status', input.status)
    }
    if (typeof input.limit === 'number' && Number.isFinite(input.limit)) {
      search.set('limit', String(input.limit))
    } else if (typeof input.limit === 'string' && input.limit.trim().length > 0) {
      search.set('limit', input.limit)
    }
    if (agentKeys && agentKeys.length > 0) {
      search.set('agent_keys', agentKeys.join(','))
    }
    const qs = search.toString()
    return target.mainApiCall('GET', `/api/missions${qs ? `?${qs}` : ''}`, sessionKey)
  }

  private async getMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)

    let mission: Record<string, unknown>
    if (sessionKey && target.isMissionSessionKey(sessionKey)) {
      const userId = target.parseUserId(sessionKey)
      if (!userId) throw new Error('Invalid mission session key: missing user id')
      const { data, error } = await this.repository.findMissionForUser(target.serviceClient, {
        missionId,
        userId,
      })
      if (error) throw new Error(`Mission not found: ${error.message}`)
      mission = data ?? {}
    } else {
      mission = (await target.mainApiCall(
        'GET',
        `/api/missions/${missionId}`,
        sessionKey,
      )) as Record<string, unknown>
    }

    const userId =
      (mission.user_id as string) ??
      (sessionKey ? (target.parseUserId(sessionKey) as string | null) : null)

    const [subtasks, logs] = await Promise.all([
      this.fetchSubtasks(target, missionId, userId, sessionKey),
      this.fetchLogs(target, missionId, userId, sessionKey),
    ])

    return { ...mission, subtasks, logs }
  }

  private async fetchSubtasks(
    target: Record<string, any>,
    missionId: string,
    userId: string | null,
    sessionKey?: string,
  ): Promise<unknown[]> {
    try {
      if (userId && sessionKey && target.isMissionSessionKey(sessionKey)) {
        const { data } = await this.repository.listMissionSubtasks(target.serviceClient, missionId)
        return data || []
      }
      const result = await target.mainApiCall(
        'GET',
        `/api/missions/${missionId}/subtasks`,
        sessionKey,
      )
      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }

  private async fetchLogs(
    target: Record<string, any>,
    missionId: string,
    userId: string | null,
    sessionKey?: string,
  ): Promise<unknown[]> {
    try {
      if (userId && sessionKey && target.isMissionSessionKey(sessionKey)) {
        const { data } = await this.repository.listMissionLogs(target.serviceClient, missionId)
        return data || []
      }
      const result = await target.mainApiCall('GET', `/api/missions/${missionId}/logs`, sessionKey)
      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }

  private async updateMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    const statusPayload: Record<string, unknown> = {}
    for (const key of ['status', 'error', 'output', 'current_agent_key', 'retry_count']) {
      if (input[key] !== undefined) statusPayload[key] = input[key]
    }
    const detailsPayload: Record<string, unknown> = {}
    for (const key of ['title', 'brief', 'priority']) {
      if (input[key] !== undefined) detailsPayload[key] = input[key]
    }

    if (Object.keys(statusPayload).length === 0 && Object.keys(detailsPayload).length === 0) {
      return { success: false, error: 'No mission updates provided' }
    }

    let latest: unknown = null
    if (Object.keys(detailsPayload).length > 0) {
      latest = await target.mainApiCall(
        'PATCH',
        `/api/missions/${missionId}`,
        sessionKey,
        detailsPayload,
      )
    }
    if (Object.keys(statusPayload).length > 0) {
      latest = await target.mainApiCall(
        'PATCH',
        `/api/missions/${missionId}/status`,
        sessionKey,
        statusPayload,
      )
    }
    if (latest) {
      const userId =
        typeof target.resolveUserId === 'function' ? target.resolveUserId(sessionKey) : null
      if (userId) {
        const orgId =
          typeof target.resolveOrgId === 'function'
            ? ((target.resolveOrgId(sessionKey) as string | null) ?? null)
            : null
        await this.indexSpaceSource(target, {
          sourceType: 'mission',
          sourceId: missionId,
          userId,
          orgId,
        })
      }
    }
    return latest ?? { success: true }
  }
}
