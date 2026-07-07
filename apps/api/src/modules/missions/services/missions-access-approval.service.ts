import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionOutboxService } from './mission-outbox.service'

@Injectable()
export class MissionsAccessApprovalService {
  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionOutboxService: MissionOutboxService,
  ) {}

  async list(supabase: SupabaseClient, userId: string, missionId: string, orgId?: string | null) {
    return this.missionsRepository.listMissionAccessRequests(supabase, missionId, userId, orgId)
  }

  async approve(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    requestIds?: string[],
  ) {
    const uniqueRequestIds = requestIds?.length ? [...new Set(requestIds)] : undefined
    const { mission, approved } = await this.missionsRepository.approveMissionAccessRequests(
      supabase,
      missionId,
      userId,
      orgId,
      uniqueRequestIds,
    )
    const subtaskIds = [
      ...new Set(
        approved
          .map((row: { subtask_id?: string | null }) => row.subtask_id)
          .filter((id: string | null | undefined): id is string => !!id),
      ),
    ]

    await this.missionsRepository.insertMissionLog(supabase, {
      mission_id: missionId,
      user_id: userId,
      org_id: orgId ?? null,
      event_type: 'mission.access_approval.approved',
      from_status: 'awaiting_access_approval',
      to_status: 'todo',
      payload: {
        approved_request_ids: approved.map((row: { id: string }) => row.id),
        subtask_ids: subtaskIds,
      },
    })

    await Promise.all(
      subtaskIds.map((subtaskId) =>
        this.missionOutboxService.enqueueOutboxEvent(supabase, {
          missionId,
          userId,
          orgId: orgId ?? null,
          eventType: 'mission.subtask.execute.requested',
          dedupeKey: `mission:${missionId}:subtask:${subtaskId}:access-approved:${Date.now()}`,
          requeueExistingDedupeKey: true,
          payload: {
            phase: 'execute',
            subtask_id: subtaskId,
            requested_by: 'mission_access_approved',
          },
        }),
      ),
    )

    return { ok: true, approved, requeued_subtask_ids: subtaskIds }
  }
}
