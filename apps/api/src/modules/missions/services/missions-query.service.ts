import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import type { MissionListQuery } from '../dto'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionLifecycleService } from './mission-lifecycle.service'

@Injectable()
export class MissionsQueryService {
  constructor(
    private readonly missionLifecycleService: MissionLifecycleService,
    private readonly missionsRepository: MissionsRepository,
    private readonly spaceRetrievalIndex: SpaceRetrievalIndexService,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    query: MissionListQuery,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.missionLifecycleService.list(supabase, userId, query, orgId, orgRole)
  }

  async getById(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.missionLifecycleService.getById(supabase, userId, missionId, orgId, orgRole)
  }

  async getLogs(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.missionLifecycleService.getLogs(supabase, userId, missionId, orgId, orgRole)
  }

  async getPlan(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.getPlan(supabase, userId, missionId, orgId)
  }

  async getDeliverables(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.getDeliverables(supabase, userId, missionId, orgId)
  }

  async getDeliverablesForMissions(
    supabase: SupabaseClient,
    userId: string,
    missionIds: string[],
    orgId?: string | null,
  ) {
    if (missionIds.length === 0) return []
    const verified = await this.missionsRepository.filterOwnedMissionIds(
      supabase,
      userId,
      orgId,
      missionIds,
    )
    if (verified.length === 0) return []
    return this.missionsRepository.listDeliverablesForMissions(supabase, verified)
  }

  async listSubtasks(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    return this.missionLifecycleService.listSubtasks(supabase, userId, missionId, orgId)
  }

  async getAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.missionsRepository.getAgent(supabase, userId, agentKey, orgId)
  }

  async updateDeliverable(
    supabase: SupabaseClient,
    userId: string,
    deliverableId: string,
    patch: {
      title?: string
      content?: string | null
      metadata?: Record<string, unknown>
    },
  ) {
    try {
      const updated = await this.missionsRepository.updateDeliverable(
        supabase,
        deliverableId,
        patch,
      )
      await this.spaceRetrievalIndex.indexSource(supabase, {
        sourceType: 'mission_deliverable',
        sourceId: deliverableId,
        userId,
        orgId: (updated as { org_id?: string | null }).org_id ?? null,
      })
      return updated
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'Deliverable not found') throw new NotFoundException('Deliverable not found')
      throw e
    }
  }
}
