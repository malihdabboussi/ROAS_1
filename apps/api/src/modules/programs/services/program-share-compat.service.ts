import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProgramPermissionsRepository } from '../repositories/program-permissions.repository'
import { ProgramShareCompatRepository } from '../repositories/program-share-compat.repository'
import { ProgramsRepository } from '../repositories/programs.repository'
import {
  detectProgramShareConflicts,
  type ProgramForCompat,
  type ProgramShareConflict,
} from './program-share-compat'

@Injectable()
export class ProgramShareCompatService {
  constructor(
    private readonly compatRepo: ProgramShareCompatRepository,
    private readonly permissionsRepo: ProgramPermissionsRepository,
    private readonly programsRepo: ProgramsRepository,
  ) {}

  /**
   * Read-only report of space shares whose access is overridden by Program
   * privacy (the shared user cannot access the campaign's Program). No writes.
   */
  async listConflicts(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<ProgramShareConflict[]> {
    const shares = await this.compatRepo.listUserSpaceShares(supabase, orgId)
    if (shares.length === 0) return []

    const campaignIds = [
      ...new Set(
        shares
          .map((s) => s.campaign_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    const programByCampaign = await this.permissionsRepo.findProgramIdsByCampaignIds(
      supabase,
      campaignIds,
    )
    const programIds = [
      ...new Set(
        [...programByCampaign.values()].filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    ]
    if (programIds.length === 0) return []

    const [programs, programAclUserIds, adminUserIds] = await Promise.all([
      this.programsRepo.listByIds(supabase, programIds, orgId),
      this.compatRepo.listProgramAclUserIds(supabase, programIds),
      this.compatRepo.listAdminUserIds(supabase, orgId),
    ])
    const programsById = new Map<string, ProgramForCompat>(
      programs.map((p) => [
        p.id,
        { id: p.id, name: p.name, visibility: p.visibility, created_by: p.created_by },
      ]),
    )

    return detectProgramShareConflicts({
      shares,
      programByCampaign,
      programsById,
      programAclUserIds,
      adminUserIds,
    })
  }
}
