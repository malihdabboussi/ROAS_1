import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { MissionsRepository } from '../repositories/missions.repository'

@Injectable()
export class MissionOutboxService {
  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly supabaseServiceClient: SupabaseServiceClient,
  ) {}

  /**
   * Always enqueue with the service-role client.
   * User-scoped clients cannot insert personal (org_id null) outbox rows under RLS,
   * and create must not leave orphan inbox missions without a plan job.
   * The `supabase` arg is kept for call-site compatibility; it is not used for writes.
   */
  async enqueueOutboxEvent(
    _supabase: SupabaseClient,
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
    await this.missionsRepository.insertMissionOutboxEvent(this.supabaseServiceClient.client, {
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
