import { Injectable } from '@nestjs/common'
import { ArtifactMissionsRepository } from '../repositories/artifact-missions.repository'

@Injectable()
export class ArtifactMissionApiActionsService {
  constructor(
    private readonly repository: ArtifactMissionsRepository = new ArtifactMissionsRepository(),
  ) {}

  async getMissionDeliverables(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    if (sessionKey && target.isMissionSessionKey(sessionKey)) {
      const userId = target.parseUserId(sessionKey)
      if (!userId) throw new Error('Invalid mission session key: missing user id')
      const { data, error } = await this.repository.listMissionDeliverables(
        target.serviceClient,
        missionId,
      )
      if (error) throw new Error(`Failed to list deliverables: ${error.message}`)
      return data || []
    }
    return target.mainApiCall('GET', `/api/missions/${missionId}/deliverables`, sessionKey)
  }

  async addMissionComment(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    const message = (input.message as string) ?? ''
    if (!message.trim()) return { success: false, error: 'message is required' }
    return target.mainApiCall('POST', `/api/missions/${missionId}/comment`, sessionKey, { message })
  }

  async getMissionPlan(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('GET', `/api/missions/${missionId}/plan`, sessionKey)
  }

  async getMissionLogs(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('GET', `/api/missions/${missionId}/logs`, sessionKey)
  }

  async listMissionSubtasks(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('GET', `/api/missions/${missionId}/subtasks`, sessionKey)
  }

  async updateMissionSubtask(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    const subtaskId = String(input.subtask_id ?? '').trim()
    if (!subtaskId) return { success: false, error: 'subtask_id is required' }

    const body: Record<string, unknown> = {}
    for (const key of Object.keys(input)) {
      if (key === 'mission_id' || key === 'subtask_id') continue
      body[key] = input[key]
    }

    return target.mainApiCall(
      'PATCH',
      `/api/missions/${missionId}/subtasks/${subtaskId}`,
      sessionKey,
      body,
    )
  }

  async retryMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('POST', `/api/missions/${missionId}/retry`, sessionKey)
  }

  async trashMission(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const missionId = this.requireMissionId(input)
    return target.mainApiCall('DELETE', `/api/missions/${missionId}`, sessionKey)
  }

  private requireMissionId(input: Record<string, unknown>): string {
    const missionId = (input.mission_id as string) ?? ''
    if (!missionId) throw new Error('mission_id is required')
    return missionId
  }
}
