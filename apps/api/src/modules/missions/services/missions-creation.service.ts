import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type { CreateMissionDto } from '../dto'
import { MissionInternalService } from './mission-internal.service'
import { MissionLifecycleService } from './mission-lifecycle.service'

@Injectable()
export class MissionsCreationService {
  constructor(
    private readonly missionLifecycleService: MissionLifecycleService,
    private readonly missionInternalService: MissionInternalService,
  ) {}

  async create(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateMissionDto,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.missionLifecycleService.create(supabase, userId, dto, orgId, orgRole)
  }

  async internalCreateMission(body: {
    user_id: string
    org_id?: string | null
    title: string
    brief?: string
    campaign_id?: string
    space_id?: string
    source_space_item_id?: string
    assigned_agent_key?: string
    idempotency_key?: string
    input?: Record<string, unknown>
  }) {
    return this.missionInternalService.internalCreateMission(body)
  }
}
