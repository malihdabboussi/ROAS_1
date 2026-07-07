import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionLifecycleService } from './mission-lifecycle.service'

@Injectable()
export class MissionsCancellationService {
  constructor(private readonly missionLifecycleService: MissionLifecycleService) {}

  async trash(supabase: SupabaseClient, userId: string, missionId: string, orgId?: string | null) {
    return this.missionLifecycleService.trash(supabase, userId, missionId, orgId)
  }
}
