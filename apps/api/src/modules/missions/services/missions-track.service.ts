import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import {
  assertTrackActionAvailable,
  buildPostCallStrategySubtasks,
  resolveTrackAgentKeys,
  type MissionTrackActionId,
} from '../playbooks/mission-track-extensions'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionLifecycleService } from './mission-lifecycle.service'
import { MissionsInternalOperationsService } from './missions-internal-operations.service'

@Injectable()
export class MissionsTrackService {
  constructor(
    private readonly missionLifecycleService: MissionLifecycleService,
    private readonly missionsInternalOperationsService: MissionsInternalOperationsService,
    private readonly missionsRepository: MissionsRepository,
  ) {}

  async extend(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    action: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const mission = await this.missionLifecycleService.getById(
      supabase,
      userId,
      missionId,
      orgId,
      orgRole,
      'edit',
    )
    const subtasks = await this.missionsRepository.listSubtasks(supabase, missionId)
    try {
      assertTrackActionAvailable(mission, subtasks, action)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid track action')
    }

    const agents = await this.missionsRepository.listOrgAgents(supabase, mission.user_id, orgId)
    let keys: { atlas: string; strategist: string }
    try {
      keys = resolveTrackAgentKeys(agents)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Missing agents')
    }

    const typedAction = action as MissionTrackActionId
    return this.missionsInternalOperationsService.managerAppendSubtasks({
      mission_id: missionId,
      user_id: mission.user_id,
      org_id: orgId ?? null,
      idempotency_key: `mission-extend:${missionId}:${typedAction}`,
      subtasks: buildPostCallStrategySubtasks({
        atlas: keys.atlas,
        strategist: keys.strategist,
        missionInput: (mission.input as Record<string, unknown> | null) ?? null,
      }),
    })
  }

  async retrySubtask(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    subtaskId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const mission = await this.missionLifecycleService.getById(
      supabase,
      userId,
      missionId,
      orgId,
      orgRole,
      'edit',
    )
    return this.missionsInternalOperationsService.managerRetrySubtask({
      mission_id: missionId,
      user_id: mission.user_id,
      org_id: orgId ?? null,
      subtask_id: subtaskId,
    })
  }
}
