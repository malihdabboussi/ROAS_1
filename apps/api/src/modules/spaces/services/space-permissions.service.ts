import { ForbiddenException, Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type {
  SpaceShareEntityType,
  SpaceShareLevel,
  UpsertSpaceItemShareDto,
  UpsertSpaceShareDto,
} from '../dto'
import { SpacePermissionsRepository } from '../repositories/space-permissions.repository'
import type {
  SharedItemResolveResult,
  SharedSpaceResolveResult,
  SpaceItemRow,
  SpaceItemShareRow,
  SpaceRow,
  SpaceShareRow,
  SpaceShareScope,
} from './space-permissions.types'
import { SpacePublicShareResolverService } from './space-public-share-resolver.service'
import { SpaceShareManagementService } from './space-share-management.service'

export type {
  SharedItemResolveResult,
  SharedSpaceResolveResult,
  SharedSpaceRosterEntry,
  SpaceShareScope,
} from './space-permissions.types'

const LEVEL_WEIGHT: Record<SpaceShareLevel, number> = {
  view: 1,
  edit: 2,
  admin: 3,
}

const ORG_BASELINE_LEVEL: Record<OrgRole, SpaceShareLevel> = {
  viewer: 'view',
  editor: 'edit',
  creator: 'edit',
  admin: 'admin',
  owner: 'admin',
}

@Injectable()
export class SpacePermissionsService {
  private readonly permissionsRepo: SpacePermissionsRepository
  private readonly publicShareResolver: SpacePublicShareResolverService
  private readonly shareManagement: SpaceShareManagementService

  constructor(
    @Optional()
    permissionsRepo?: SpacePermissionsRepository,
    @Optional()
    publicShareResolver?: SpacePublicShareResolverService,
    @Optional()
    shareManagement?: SpaceShareManagementService,
  ) {
    this.permissionsRepo = permissionsRepo ?? new SpacePermissionsRepository()
    this.publicShareResolver = publicShareResolver ?? new SpacePublicShareResolverService()
    this.shareManagement = shareManagement ?? new SpaceShareManagementService()
  }

  private maxLevel(levels: Array<SpaceShareLevel | null | undefined>): SpaceShareLevel | null {
    const cleaned = levels.filter((level): level is SpaceShareLevel => Boolean(level))
    if (cleaned.length === 0) return null
    return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  private hasRequiredLevel(actual: SpaceShareLevel | null, required: SpaceShareLevel): boolean {
    if (!actual) return false
    return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
  }

  private baselineFromOrgRole(orgRole: OrgRole | null): SpaceShareLevel | null {
    if (!orgRole) return null
    return ORG_BASELINE_LEVEL[orgRole]
  }

  private shareApplies(
    share: Pick<SpaceItemShareRow | SpaceShareRow, 'entity_type' | 'entity_id' | 'org_id'>,
    userId: string,
    orgId?: string | null,
  ): boolean {
    if (share.entity_type === 'user') return share.entity_id === userId
    if (share.entity_type !== 'org') return false
    if (!orgId) return false
    return share.entity_id === orgId || share.org_id === orgId
  }

  private async itemAncestry(
    supabase: SupabaseClient,
    spaceId: string,
    item: SpaceItemRow,
    orgId?: string | null,
  ): Promise<string[]> {
    const ids: string[] = [item.id]
    const seen = new Set<string>(ids)
    let cursorParent = item.parent_item_id
    let guard = 0
    while (cursorParent && guard < 25) {
      if (seen.has(cursorParent)) break
      const parent = await this.permissionsRepo.loadItem(supabase, spaceId, cursorParent)
      if (!parent) break
      ids.push(parent.id)
      seen.add(parent.id)
      cursorParent = parent.parent_item_id
      guard += 1
    }
    return ids
  }

  private async resolveShareLevelFromItemTree(
    supabase: SupabaseClient,
    spaceId: string,
    item: SpaceItemRow,
    userId: string,
    orgId?: string | null,
  ): Promise<SpaceShareLevel | null> {
    const ancestry = await this.itemAncestry(supabase, spaceId, item, orgId)
    const shareRows = await this.permissionsRepo.listItemShares(supabase, spaceId, ancestry)
    const levels: SpaceShareLevel[] = []

    for (const ancestorId of ancestry) {
      const depth = ancestry.indexOf(ancestorId)
      const rowsForAncestor = shareRows.filter((row) => row.item_id === ancestorId)
      for (const row of rowsForAncestor) {
        if (depth > 0 && !row.inherit_to_children) continue
        if (!this.shareApplies(row, userId, orgId)) continue
        levels.push(row.level)
      }
    }

    return this.maxLevel(levels)
  }

  private resolveSpaceLevelFromSpaceRow(
    spaceShareLevel: SpaceShareLevel | null,
    userId: string,
    orgId: string | null | undefined,
    orgRole: OrgRole | null | undefined,
    space: SpaceRow,
  ): SpaceShareLevel | null {
    if (space.user_id === userId) return 'admin'
    if (space.visibility === 'private') return this.maxLevel([spaceShareLevel])
    if (space.visibility === 'team' && orgId && space.org_id === orgId) {
      return this.maxLevel([this.baselineFromOrgRole(orgRole ?? null), spaceShareLevel])
    }
    return this.maxLevel([spaceShareLevel])
  }

  private async resolveSpaceShareLevel(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<SpaceShareScope> {
    // 1) Whole-space shares (space_shares rows).
    const spaceShareRows = await this.permissionsRepo.listSpaceShares(supabase, spaceId)
    const matchingSpaceShares = spaceShareRows.filter((row) =>
      this.shareApplies(row, userId, orgId),
    )

    // 2) Per-view shares (space_view_shares rows).
    const viewShareRows = await this.permissionsRepo.listSpaceViewShares(supabase, spaceId)
    const matchingViewShares = viewShareRows.filter((row) => this.shareApplies(row, userId, orgId))

    if (matchingSpaceShares.length === 0 && matchingViewShares.length === 0) {
      return { level: null, allowed_view_ids: null }
    }

    // Combined level = max across all matching (space + view) shares.
    const level = this.maxLevel([
      ...matchingSpaceShares.map((row) => row.level),
      ...matchingViewShares.map((row) => row.level),
    ])
    if (!level) return { level: null, allowed_view_ids: null }

    // If any space_share grants the entire space (null allowed_view_ids), allowed_view_ids = null.
    if (
      matchingSpaceShares.some(
        (row) => row.allowed_view_ids === null || row.allowed_view_ids === undefined,
      )
    ) {
      return { level, allowed_view_ids: null }
    }

    // Otherwise: union of space_share.allowed_view_ids + space_view_shares.view_id.
    const allowed = new Set<string>()
    for (const row of matchingSpaceShares) {
      for (const viewId of row.allowed_view_ids ?? []) {
        if (typeof viewId === 'string' && viewId.trim()) allowed.add(viewId)
      }
    }
    for (const row of matchingViewShares) {
      if (typeof row.view_id === 'string' && row.view_id.trim()) allowed.add(row.view_id)
    }
    return { level, allowed_view_ids: [...allowed] }
  }

  resolveAllowedViewIdsForSchema(scope: SpaceShareScope, schema: unknown): string[] | null {
    if (scope.allowed_view_ids === null) return null
    const viewIds =
      schema &&
      typeof schema === 'object' &&
      !Array.isArray(schema) &&
      Array.isArray((schema as { views?: unknown }).views)
        ? (schema as { views: Array<{ id?: unknown }> }).views
            .map((view) => (typeof view.id === 'string' ? view.id : null))
            .filter((id): id is string => Boolean(id))
        : []
    const valid = new Set(viewIds)
    return scope.allowed_view_ids.filter((viewId) => valid.has(viewId))
  }

  async resolveEffectiveLevel(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    spaceId: string,
    itemId?: string,
    orgId?: string | null,
  ): Promise<SpaceShareLevel | null> {
    const space = await this.permissionsRepo.loadSpaceForAccess(supabase, spaceId)
    if (!space) return null

    // Space owner is always admin on the space and on every item it contains —
    // short-circuit before touching `space_items` so a missing/broken item row
    // can never strip rights from the user who owns the space.
    if (space.user_id === userId) return 'admin'

    const spaceShareScope = await this.resolveSpaceShareLevel(supabase, spaceId, userId, orgId)
    const spaceLevel = this.resolveSpaceLevelFromSpaceRow(
      spaceShareScope.level,
      userId,
      orgId,
      orgRole,
      space,
    )
    if (!itemId) return spaceLevel

    const item = await this.permissionsRepo.loadItem(supabase, spaceId, itemId)
    if (!item) return null
    if (item.user_id === userId) return 'admin'

    const shareLevel = await this.resolveShareLevelFromItemTree(
      supabase,
      spaceId,
      item,
      userId,
      orgId,
    )
    if (item.is_private) return this.maxLevel([shareLevel])
    return this.maxLevel([spaceLevel, shareLevel])
  }

  async assertCanAccessItem(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    spaceId: string,
    itemId: string,
    requiredLevel: SpaceShareLevel,
    orgId?: string | null,
  ): Promise<SpaceShareLevel> {
    const effective = await this.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      spaceId,
      itemId,
      orgId,
    )
    if (!this.hasRequiredLevel(effective, requiredLevel)) {
      throw new ForbiddenException('Insufficient permissions for this item')
    }
    return effective as SpaceShareLevel
  }

  async assertCanAccessSpace(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    spaceId: string,
    requiredLevel: SpaceShareLevel,
    orgId?: string | null,
  ): Promise<SpaceShareLevel> {
    const effective = await this.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      spaceId,
      undefined,
      orgId,
    )
    if (!this.hasRequiredLevel(effective, requiredLevel)) {
      throw new ForbiddenException('Insufficient permissions for this space')
    }
    return effective as SpaceShareLevel
  }

  async resolveSpaceAccessScope(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    spaceId: string,
    orgId?: string | null,
    schema?: unknown,
  ): Promise<{ level: SpaceShareLevel; allowed_view_ids: string[] | null }> {
    const space = await this.permissionsRepo.loadSpaceForAccess(supabase, spaceId)
    if (!space) throw new ForbiddenException('Insufficient permissions for this space')

    const spaceShareScope = await this.resolveSpaceShareLevel(supabase, spaceId, userId, orgId)
    const level = this.resolveSpaceLevelFromSpaceRow(
      spaceShareScope.level,
      userId,
      orgId,
      orgRole,
      space,
    )
    if (!level) throw new ForbiddenException('Insufficient permissions for this space')

    if (space.user_id === userId) return { level, allowed_view_ids: null }
    if (space.visibility === 'team' && orgId && space.org_id === orgId) {
      return { level, allowed_view_ids: null }
    }

    return {
      level,
      allowed_view_ids: this.resolveAllowedViewIdsForSchema(spaceShareScope, schema),
    }
  }

  async listSpaceShares(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<SpaceShareRow[]> {
    return this.shareManagement.listSpaceShares(supabase, spaceId, orgId)
  }

  async upsertSpaceShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: UpsertSpaceShareDto,
    orgId?: string | null,
  ): Promise<SpaceShareRow> {
    return this.shareManagement.upsertSpaceShare(supabase, userId, spaceId, dto, orgId)
  }

  async deleteSpaceShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.shareManagement.deleteSpaceShare(supabase, spaceId, shareId, orgId)
  }

  // ─── Per-view shares (space_view_shares) ─────────────────────────────────
  async listSpaceViewShares(
    supabase: SupabaseClient,
    spaceId: string,
    viewId: string | null,
    orgId?: string | null,
  ): Promise<
    Array<{
      id: string
      space_id: string
      view_id: string
      org_id: string | null
      entity_type: SpaceShareEntityType
      entity_id: string
      level: SpaceShareLevel
      created_by: string
      created_at: string
    }>
  > {
    return this.shareManagement.listSpaceViewShares(supabase, spaceId, viewId, orgId)
  }

  async upsertSpaceViewShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    viewId: string,
    dto: { entity_type: SpaceShareEntityType; entity_id: string; level: SpaceShareLevel },
    orgId?: string | null,
  ) {
    return this.shareManagement.upsertSpaceViewShare(supabase, userId, spaceId, viewId, dto, orgId)
  }

  async deleteSpaceViewShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.shareManagement.deleteSpaceViewShare(supabase, spaceId, shareId, orgId)
  }

  async setSpaceVisibility(
    supabase: SupabaseClient,
    spaceId: string,
    visibility: 'private' | 'team',
    orgId?: string | null,
  ): Promise<SpaceRow> {
    return this.shareManagement.setSpaceVisibility(supabase, spaceId, visibility, orgId)
  }

  async listItemShares(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow[]> {
    return this.shareManagement.listItemShares(supabase, spaceId, itemId, orgId)
  }

  async upsertItemShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: UpsertSpaceItemShareDto,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow> {
    return this.shareManagement.upsertItemShare(supabase, userId, spaceId, itemId, dto, orgId)
  }

  async deleteItemShare(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.shareManagement.deleteItemShare(supabase, spaceId, itemId, shareId, orgId)
  }

  async enableItemShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    shareToken: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.shareManagement.enableItemShareLink(supabase, spaceId, itemId, shareToken, orgId)
  }

  async disableItemShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.shareManagement.disableItemShareLink(supabase, spaceId, itemId, orgId)
  }

  async enableSpaceShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.shareManagement.enableSpaceShareLink(supabase, spaceId, orgId)
  }

  async disableSpaceShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.shareManagement.disableSpaceShareLink(supabase, spaceId, orgId)
  }

  async createItemEmailInvite(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    email: string,
    level: SpaceShareLevel,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow> {
    return this.shareManagement.createItemEmailInvite(
      supabase,
      userId,
      spaceId,
      itemId,
      email,
      level,
      orgId,
    )
  }

  async resolveSharedItemByToken(
    supabase: SupabaseClient,
    token: string,
  ): Promise<SharedItemResolveResult | null> {
    return this.publicShareResolver.resolveSharedItemByToken(supabase, token)
  }

  async resolveSharedSpaceByToken(
    supabase: SupabaseClient,
    token: string,
  ): Promise<SharedSpaceResolveResult | null> {
    return this.publicShareResolver.resolveSharedSpaceByToken(supabase, token)
  }
}
