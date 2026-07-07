import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AddMissionCommentDto,
  UpdateMissionDto,
  UpdateMissionStatusDto,
  UpdateSubtaskDto,
} from '../dto'
import { MissionLifecycleService } from './mission-lifecycle.service'

@Injectable()
export class MissionsExecutionService {
  constructor(private readonly missionLifecycleService: MissionLifecycleService) {}

  async addUserComment(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: AddMissionCommentDto,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.addUserComment(supabase, userId, missionId, dto, orgId)
  }

  async updateStatus(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: UpdateMissionStatusDto,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.updateStatus(supabase, userId, missionId, dto, orgId)
  }

  async updateMission(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    dto: UpdateMissionDto,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.updateMission(supabase, userId, missionId, dto, orgId)
  }

  async retry(supabase: SupabaseClient, userId: string, missionId: string, orgId?: string | null) {
    return this.missionLifecycleService.retry(supabase, userId, missionId, undefined, orgId)
  }

  async updateSubtask(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.updateSubtask(
      supabase,
      userId,
      missionId,
      subtaskId,
      dto,
      orgId,
    )
  }

  async bulkUpdate(
    supabase: SupabaseClient,
    userId: string,
    updates: Array<{ id: string; status?: string; sort_order?: number }>,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.bulkUpdate(supabase, userId, updates, orgId)
  }
}
