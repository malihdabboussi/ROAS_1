import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepository } from '../repositories/missions.repository'

@Injectable()
export class MissionOutboxService {
  constructor(private readonly missionsRepository: MissionsRepository) {}

  async enqueueOutboxEvent(
    supabase: SupabaseClient,
    input: {
      missionId: string
      userId: string
      orgId?: string | null
      eventType: string
      dedupeKey: string
      payload?: Record<string, unknown>
      requeueExistingDedupeKey?: boolean
      priorityRank?: number
      nextAttemptAt?: string
    },
  ) {
    await this.missionsRepository.insertMissionOutboxEvent(supabase, {
      mission_id: input.missionId,
      user_id: input.userId,
      org_id: input.orgId ?? null,
      event_type: input.eventType,
      dedupe_key: input.dedupeKey,
      payload: input.payload || {},
      requeue_existing_dedupe_key: input.requeueExistingDedupeKey,
      priority_rank: input.priorityRank,
      next_attempt_at: input.nextAttemptAt,
    })
  }
}
