import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type {
  ProgramRow,
  ProgramShareLevel,
  ProgramShareRow,
  ProgramVisibility,
  UpsertProgramShareInput,
} from '../dto/programs.dto'
import { ProgramPermissionsRepository } from '../repositories/program-permissions.repository'
import { ProgramsRepository } from '../repositories/programs.repository'

const LEVEL_WEIGHT: Record<ProgramShareLevel, number> = {
  view: 1,
  edit: 2,
}

const ORG_BASELINE_LEVEL: Record<OrgRole, ProgramShareLevel> = {
  viewer: 'view',
  editor: 'edit',
  creator: 'edit',
  admin: 'edit',
  owner: 'edit',
}

@Injectable()
export class ProgramPermissionsService {
  constructor(
    private readonly permissionsRepo: ProgramPermissionsRepository,
    private readonly programsRepo: ProgramsRepository,
  ) {}

  private maxLevel(levels: Array<ProgramShareLevel | null | undefined>): ProgramShareLevel | null {
    const cleaned = levels.filter((level): level is ProgramShareLevel => Boolean(level))
    if (cleaned.length === 0) return null
    return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  private hasRequiredLevel(actual: ProgramShareLevel | null, required: ProgramShareLevel): boolean {
    if (!actual) return false
    return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
  }

  private isOrgAdmin(orgRole: OrgRole | null | undefined): boolean {
    return orgRole === 'owner' || orgRole === 'admin'
  }

  resolveProgramLevelFromRow(
    program: ProgramRow,
    userId: string,
    orgRole: OrgRole | null | undefined,
    shareLevel: ProgramShareLevel | null,
  ): ProgramShareLevel | null {
    if (program.user_id && program.user_id === userId) return 'edit'
    if (this.isOrgAdmin(orgRole)) return 'edit'
    if (program.created_by && program.created_by === userId) return 'edit'

    if (program.visibility === 'workspace') {
      const baseline = orgRole ? ORG_BASELINE_LEVEL[orgRole] : null
      return this.maxLevel([baseline, shareLevel])
    }

    // private + selected: ACL only (created_by / admin handled above)
    return this.maxLevel([shareLevel])
  }

  async resolveProgramLevel(
    supabase: SupabaseClient,
    programId: string,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<ProgramShareLevel | null> {
    const program = await this.programsRepo.findById(supabase, programId, orgId)
    if (!program) return null
    const shares = await this.permissionsRepo.listSharesForPrograms(supabase, [programId], userId)
    const shareLevel = this.maxLevel(shares.map((s) => s.level))
    return this.resolveProgramLevelFromRow(program, userId, orgRole, shareLevel)
  }

  async assertProgramAccess(
    supabase: SupabaseClient,
    programId: string,
    userId: string,
    orgRole: OrgRole | null | undefined,
    required: ProgramShareLevel,
    orgId?: string | null,
  ): Promise<ProgramShareLevel> {
    const level = await this.resolveProgramLevel(supabase, programId, userId, orgRole, orgId)
    if (!this.hasRequiredLevel(level, required)) {
      throw new ForbiddenException('Insufficient permissions for this program')
    }
    return level as ProgramShareLevel
  }

  async filterAccessiblePrograms(
    supabase: SupabaseClient,
    programs: ProgramRow[],
    userId: string,
    orgRole: OrgRole | null | undefined,
  ): Promise<Array<ProgramRow & { effective_level: ProgramShareLevel }>> {
    if (programs.length === 0) return []
    const shares = await this.permissionsRepo.listSharesForPrograms(
      supabase,
      programs.map((p) => p.id),
      userId,
    )
    const shareByProgram = new Map<string, ProgramShareLevel>()
    for (const share of shares) {
      const prev = shareByProgram.get(share.program_id) ?? null
      const next = this.maxLevel([prev, share.level])
      if (next) shareByProgram.set(share.program_id, next)
    }

    const out: Array<ProgramRow & { effective_level: ProgramShareLevel }> = []
    for (const program of programs) {
      const level = this.resolveProgramLevelFromRow(
        program,
        userId,
        orgRole,
        shareByProgram.get(program.id) ?? null,
      )
      if (!level) continue
      out.push({ ...program, effective_level: level })
    }
    return out
  }

  async filterAccessibleCampaignsByProgram<T extends { id: string; program_id?: string | null }>(
    supabase: SupabaseClient,
    campaigns: T[],
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
    required: ProgramShareLevel = 'view',
  ): Promise<T[]> {
    const programIds = [
      ...new Set(
        campaigns
          .map((c) => c.program_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ]
    if (programIds.length === 0) return campaigns

    // Resolve every referenced program in one query (was N findById calls).
    const programs = await this.programsRepo.listByIds(supabase, programIds, orgId)
    const accessible = await this.filterAccessiblePrograms(supabase, programs, userId, orgRole)
    const allowed = new Set(
      accessible.filter((p) => this.hasRequiredLevel(p.effective_level, required)).map((p) => p.id),
    )

    return campaigns.filter((campaign) => {
      if (!campaign.program_id) return true
      return allowed.has(campaign.program_id)
    })
  }

  /**
   * Gate a space move between campaigns by the invoking user's Program access.
   * Moving a space into a campaign that lives in a restricted Program requires
   * Program `edit`; leaving a restricted Program requires `edit` on the source
   * too, so a Private Program's ACL can't be bypassed via space reparenting.
   */
  async assertSpaceCampaignMoveAccess(
    supabase: SupabaseClient,
    sourceCampaignId: string | null,
    targetCampaignId: string | null,
    userId: string,
    orgRole: OrgRole | null | undefined,
    required: ProgramShareLevel = 'edit',
    orgId?: string | null,
  ): Promise<void> {
    const campaignIds = [sourceCampaignId, targetCampaignId].filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    )
    if (campaignIds.length === 0) return
    const programByCampaign = await this.permissionsRepo.findProgramIdsByCampaignIds(
      supabase,
      campaignIds,
    )
    const seen = new Set<string>()
    for (const campaignId of campaignIds) {
      const programId = programByCampaign.get(campaignId) ?? null
      if (!programId || seen.has(programId)) continue
      seen.add(programId)
      await this.assertProgramAccess(supabase, programId, userId, orgRole, required, orgId)
    }
  }

  async assertCampaignProgramAccess(
    supabase: SupabaseClient,
    campaign: { program_id?: string | null },
    userId: string,
    orgRole: OrgRole | null | undefined,
    required: ProgramShareLevel,
    orgId?: string | null,
  ): Promise<ProgramShareLevel | null> {
    if (!campaign.program_id) return null
    return this.assertProgramAccess(supabase, campaign.program_id, userId, orgRole, required, orgId)
  }

  async listShares(
    supabase: SupabaseClient,
    programId: string,
    orgId?: string | null,
  ): Promise<ProgramShareRow[]> {
    return this.permissionsRepo.listShares(supabase, programId, orgId)
  }

  async upsertShare(
    supabase: SupabaseClient,
    userId: string,
    programId: string,
    input: UpsertProgramShareInput,
    orgId?: string | null,
  ): Promise<ProgramShareRow> {
    return this.permissionsRepo.upsertShare(supabase, programId, userId, input, orgId)
  }

  async deleteShare(
    supabase: SupabaseClient,
    programId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    const deleted = await this.permissionsRepo.deleteShare(supabase, programId, shareId, orgId)
    if (!deleted) throw new NotFoundException('Program share not found')
  }

  async setVisibility(
    supabase: SupabaseClient,
    programId: string,
    visibility: ProgramVisibility,
    actingUserId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<ProgramRow> {
    const program = await this.programsRepo.findById(supabase, programId, orgId)
    if (!program) throw new NotFoundException('Program not found')

    if (visibility === 'private' || visibility === 'selected') {
      const isCreator = program.created_by != null && program.created_by === actingUserId
      const canFlip =
        this.isOrgAdmin(orgRole) ||
        isCreator ||
        // Creator-less programs: acting admin/user with edit becomes created_by.
        (program.created_by == null &&
          this.hasRequiredLevel(
            await this.resolveProgramLevel(supabase, programId, actingUserId, orgRole, orgId),
            'edit',
          ))
      if (!canFlip) {
        throw new ForbiddenException(
          'Only the program owner or an org admin can set private or selected visibility',
        )
      }
    } else {
      await this.assertProgramAccess(supabase, programId, actingUserId, orgRole, 'edit', orgId)
    }

    const createdBy =
      (visibility === 'private' || visibility === 'selected') && !program.created_by
        ? actingUserId
        : null

    const updated = await this.permissionsRepo.setVisibility(
      supabase,
      programId,
      visibility,
      orgId,
      createdBy,
    )
    if (!updated) throw new NotFoundException('Program not found')
    return updated
  }

  canManageShares(
    program: ProgramRow,
    userId: string,
    orgRole: OrgRole | null | undefined,
    effectiveLevel: ProgramShareLevel,
  ): boolean {
    if (this.isOrgAdmin(orgRole)) return true
    if (program.created_by && program.created_by === userId) return true
    return effectiveLevel === 'edit'
  }
}
