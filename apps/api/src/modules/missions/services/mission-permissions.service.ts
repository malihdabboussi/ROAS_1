import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { SpacePermissionsService } from '../../spaces/services/space-permissions.service'
import { MissionsRepository } from '../repositories/missions.repository'

type MissionShareLevel = 'view' | 'comment' | 'edit' | 'admin'
type MissionVisibility = 'private' | 'space' | 'shared' | 'campaign'

const LEVEL_WEIGHT: Record<MissionShareLevel, number> = {
  view: 1,
  comment: 2,
  edit: 3,
  admin: 4,
}

const SENSITIVE_MISSION_FIELDS = [
  'brief',
  'description',
  'input',
  'output',
  'error',
  'progress_notes',
  'plan_id',
  'correlation_id',
  'idempotency_key',
  'retry_count',
]

@Injectable()
export class MissionPermissionsService {
  constructor(
    private readonly spacePermissions: SpacePermissionsService,
    private readonly missionsRepository: MissionsRepository = new MissionsRepository(),
  ) {}

  private hasRequiredLevel(level: MissionShareLevel | null, required: MissionShareLevel): boolean {
    if (!level) return false
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[required]
  }

  private maxLevel(levels: Array<MissionShareLevel | null | undefined>): MissionShareLevel | null {
    const cleaned = levels.filter((level): level is MissionShareLevel => Boolean(level))
    if (cleaned.length === 0) return null
    return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  private shareApplies(
    share: { entity_type: string; entity_id: string; org_id?: string | null },
    userId: string,
    orgId?: string | null,
  ): boolean {
    if (share.entity_type === 'user') return share.entity_id === userId
    if (share.entity_type !== 'org') return false
    if (!orgId) return false
    return share.entity_id === orgId || share.org_id === orgId
  }

  private missionVisibility(mission: Record<string, unknown>): MissionVisibility {
    const raw = mission.mission_visibility
    if (raw === 'space' || raw === 'shared' || raw === 'campaign') return raw
    return 'private'
  }

  private async explicitShareLevel(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<MissionShareLevel | null> {
    const data = await this.missionsRepository.listMissionSharesForPermission(supabase, missionId)
    const matching = (data ?? []).filter((row) => this.shareApplies(row, userId, orgId))
    return this.maxLevel(matching.map((row) => row.level as MissionShareLevel))
  }

  private async spaceLevel(
    supabase: SupabaseClient,
    mission: Record<string, unknown>,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<MissionShareLevel | null> {
    const spaceId = typeof mission.space_id === 'string' ? mission.space_id : null
    if (!spaceId || this.missionVisibility(mission) !== 'space') return null
    const level = await this.spacePermissions.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      spaceId,
      undefined,
      orgId,
    )
    if (level === 'admin') return 'admin'
    if (level === 'edit') return 'edit'
    if (level === 'view') return 'view'
    return null
  }

  private async campaignLevel(
    supabase: SupabaseClient,
    mission: Record<string, unknown>,
  ): Promise<MissionShareLevel | null> {
    const campaignId = typeof mission.campaign_id === 'string' ? mission.campaign_id : null
    if (!campaignId || this.missionVisibility(mission) !== 'campaign') return null
    const campaign = await this.missionsRepository.findMissionCampaignForPermission(
      supabase,
      campaignId,
    )
    return campaign?.id ? 'view' : null
  }

  async resolveMissionLevel(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    mission: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<MissionShareLevel | null> {
    if (mission.user_id === userId) return 'admin'
    const levels = await Promise.all([
      this.explicitShareLevel(supabase, String(mission.id), userId, orgId),
      this.spaceLevel(supabase, mission, userId, orgRole, orgId),
      this.campaignLevel(supabase, mission),
    ])
    return this.maxLevel(levels)
  }

  redactMission(
    mission: Record<string, unknown>,
    level: MissionShareLevel,
  ): Record<string, unknown> {
    if (this.hasRequiredLevel(level, 'edit')) return mission
    const redacted = { ...mission }
    for (const field of SENSITIVE_MISSION_FIELDS) {
      if (field in redacted) redacted[field] = null
    }
    return redacted
  }

  async assertCanAccessMission(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    mission: Record<string, unknown> | null,
    requiredLevel: MissionShareLevel,
    orgId?: string | null,
  ): Promise<MissionShareLevel> {
    if (!mission) throw new NotFoundException('Mission not found')
    const level = await this.resolveMissionLevel(supabase, userId, orgRole, mission, orgId)
    if (!this.hasRequiredLevel(level, requiredLevel)) {
      throw new ForbiddenException('Insufficient permissions for this mission')
    }
    return level as MissionShareLevel
  }

  async filterVisibleMissions(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    missions: Record<string, unknown>[],
    orgId?: string | null,
  ): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = []
    for (const mission of missions) {
      const level = await this.resolveMissionLevel(supabase, userId, orgRole, mission, orgId)
      if (level) out.push(this.redactMission(mission, level))
    }
    return out
  }
}
