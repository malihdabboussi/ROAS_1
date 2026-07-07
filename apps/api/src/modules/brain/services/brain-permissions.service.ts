import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole, RequestScope } from '@vibey/api-shared'
import { BrainPermissionsRepository } from '../repositories/brain-permissions.repository'

export type BrainAccessLevel = 'view' | 'query' | 'train'
export type BrainShareEntityType = 'user' | 'org' | 'team'
export type BrainAccessSource = 'owner' | 'org_baseline' | 'user_share' | 'org_share' | 'team_share'

type BrainScope = 'user' | 'agent' | 'campaign' | 'customer' | 'company'

export type BrainAccessRow = {
  id: string
  owner_id: string
  org_id: string | null
  scope: BrainScope
  agent_id: string | null
  created_by: string | null
}

export type BrainShareRow = {
  id: string
  brain_id: string
  org_id: string | null
  entity_type: BrainShareEntityType
  entity_id: string
  level: BrainAccessLevel
  created_by: string
  created_at: string
}

export type BrainAccessResolution = BrainAccessRow & {
  effective_level: BrainAccessLevel
  access_source: BrainAccessSource
}

const LEVEL_WEIGHT: Record<BrainAccessLevel, number> = {
  view: 1,
  query: 2,
  train: 3,
}

@Injectable()
export class BrainPermissionsService {
  constructor(private readonly brainPermissionsRepository: BrainPermissionsRepository) {}

  private maxLevel(levels: Array<BrainAccessLevel | null | undefined>): BrainAccessLevel | null {
    const clean = levels.filter((level): level is BrainAccessLevel => Boolean(level))
    if (clean.length === 0) return null
    return clean.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  private maxAccess(
    candidates: Array<{ level: BrainAccessLevel; source: BrainAccessSource }>,
  ): { level: BrainAccessLevel; source: BrainAccessSource } | null {
    if (candidates.length === 0) return null
    return candidates.sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level])[0] ?? null
  }

  private meets(actual: BrainAccessLevel | null, required: BrainAccessLevel): boolean {
    if (!actual) return false
    return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
  }

  async loadBrain(supabase: SupabaseClient, brainId: string): Promise<BrainAccessRow | null> {
    return this.brainPermissionsRepository.loadBrain(supabase, brainId)
  }

  private async loadTeamIds(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<Set<string>> {
    return this.brainPermissionsRepository.loadTeamIds(supabase, userId, orgId)
  }

  private async loadShares(supabase: SupabaseClient, brainId: string): Promise<BrainShareRow[]> {
    return this.brainPermissionsRepository.loadShares(supabase, brainId)
  }

  private baselineAccess(
    brain: BrainAccessRow,
    userId: string,
    orgRole: OrgRole | null | undefined,
  ): { level: BrainAccessLevel; source: BrainAccessSource } | null {
    if (!brain.org_id) {
      return brain.owner_id === userId ? { level: 'train', source: 'owner' } : null
    }

    if (!orgRole || orgRole === 'viewer') return null
    if (brain.owner_id === userId) return { level: 'train', source: 'owner' }
    if (orgRole === 'owner' || orgRole === 'admin') {
      return { level: 'train', source: 'org_baseline' }
    }

    if (brain.scope === 'agent') {
      return brain.created_by === userId
        ? { level: 'train', source: 'owner' }
        : { level: 'query', source: 'org_baseline' }
    }

    if (brain.scope === 'customer' || brain.scope === 'company') {
      return { level: 'query', source: 'org_baseline' }
    }
    if (brain.scope === 'user') return null

    return { level: 'query', source: 'org_baseline' }
  }

  private shareApplies(
    share: BrainShareRow,
    brain: BrainAccessRow,
    userId: string,
    teamIds: Set<string>,
  ): boolean {
    if (share.entity_type === 'user') return share.entity_id === userId
    if (share.entity_type === 'org')
      return Boolean(brain.org_id && share.entity_id === brain.org_id)
    return teamIds.has(share.entity_id)
  }

  async resolveEffectiveBrainLevel(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
  ): Promise<BrainAccessLevel | null> {
    const access = await this.resolveEffectiveBrainAccess(supabase, userId, scope, brainId)
    return access?.effective_level ?? null
  }

  async resolveEffectiveBrainAccess(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
  ): Promise<BrainAccessResolution | null> {
    const brain = await this.loadBrain(supabase, brainId)
    if (!brain) return null

    if (brain.org_id && (!scope.orgId || scope.orgId !== brain.org_id)) return null
    if (brain.org_id && scope.orgRole === 'viewer') return null

    const baseline = this.baselineAccess(brain, userId, scope.orgRole)
    const [shares, teamIds] = await Promise.all([
      this.loadShares(supabase, brainId),
      this.loadTeamIds(supabase, userId, brain.org_id),
    ])

    const matchingShares = shares
      .filter((share) => this.shareApplies(share, brain, userId, teamIds))
      .map((share) => ({
        level: share.level,
        source: `${share.entity_type}_share` as BrainAccessSource,
      }))

    const effective = this.maxAccess([...(baseline ? [baseline] : []), ...matchingShares])
    if (!effective) return null
    return {
      ...brain,
      effective_level: effective.level,
      access_source: effective.source,
    }
  }

  async assertCanAccessBrain(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
    required: BrainAccessLevel,
  ): Promise<BrainAccessLevel> {
    const level = await this.resolveEffectiveBrainLevel(supabase, userId, scope, brainId)
    if (!this.meets(level, required)) {
      throw new ForbiddenException('Insufficient brain permissions')
    }
    return level as BrainAccessLevel
  }

  async assertCanViewBrain(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
  ): Promise<BrainAccessLevel> {
    return this.assertCanAccessBrain(supabase, userId, scope, brainId, 'view')
  }

  async assertCanQueryBrain(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
  ): Promise<BrainAccessLevel> {
    return this.assertCanAccessBrain(supabase, userId, scope, brainId, 'query')
  }

  async assertCanTrainBrain(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
    brainId: string,
  ): Promise<BrainAccessLevel> {
    return this.assertCanAccessBrain(supabase, userId, scope, brainId, 'train')
  }

  async listAccessibleBrains(
    supabase: SupabaseClient,
    userId: string,
    scope: Pick<RequestScope, 'orgId' | 'orgRole'>,
  ): Promise<BrainAccessResolution[]> {
    if (scope.orgId && scope.orgRole === 'viewer') return []

    const rows = await this.brainPermissionsRepository.listBrains(supabase, scope)
    const withLevels = await Promise.all(
      rows.map(async (brain) => {
        return this.resolveEffectiveBrainAccess(supabase, userId, scope, brain.id)
      }),
    )
    return withLevels.filter((brain): brain is BrainAccessResolution => Boolean(brain))
  }

  async ensureBrainExists(supabase: SupabaseClient, brainId: string): Promise<BrainAccessRow> {
    const brain = await this.loadBrain(supabase, brainId)
    if (!brain) throw new NotFoundException('Brain not found')
    return brain
  }
}
