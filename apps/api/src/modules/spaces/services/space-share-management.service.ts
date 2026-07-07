import { randomUUID } from 'node:crypto'
import { ForbiddenException, Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SpaceShareEntityType,
  SpaceShareLevel,
  UpsertSpaceItemShareDto,
  UpsertSpaceShareDto,
} from '../dto'
import { SpaceShareManagementRepository } from '../repositories/space-share-management.repository'
import type { SpaceItemShareRow, SpaceRow, SpaceShareRow } from './space-permissions.types'

@Injectable()
export class SpaceShareManagementService {
  constructor(
    @Optional()
    private readonly repo: SpaceShareManagementRepository = new SpaceShareManagementRepository(),
  ) {}

  async listSpaceShares(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<SpaceShareRow[]> {
    return this.repo.listSpaceShares(supabase, spaceId, orgId)
  }

  async upsertSpaceShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: UpsertSpaceShareDto,
    orgId?: string | null,
  ): Promise<SpaceShareRow> {
    const space = await this.repo.loadSpace(supabase, spaceId, orgId)
    if (!space) throw new ForbiddenException('Space not found')
    if (dto.entity_type === 'org' && orgId && dto.entity_id !== orgId) {
      throw new ForbiddenException('Organization share must target the active organization')
    }
    return this.repo.upsertSpaceShare(supabase, {
      space_id: spaceId,
      org_id: space.org_id,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      level: dto.level,
      allowed_view_ids: dto.allowed_view_ids ?? null,
      created_by: userId,
    })
  }

  async deleteSpaceShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.repo.deleteSpaceShare(supabase, spaceId, shareId, orgId)
  }

  async listSpaceViewShares(
    supabase: SupabaseClient,
    spaceId: string,
    viewId: string | null,
    orgId?: string | null,
  ) {
    return this.repo.listSpaceViewShares(supabase, spaceId, viewId, orgId)
  }

  async upsertSpaceViewShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    viewId: string,
    dto: { entity_type: SpaceShareEntityType; entity_id: string; level: SpaceShareLevel },
    orgId?: string | null,
  ) {
    const space = await this.repo.loadSpace(supabase, spaceId, orgId)
    if (!space) throw new ForbiddenException('Space not found')
    if (dto.entity_type === 'org' && orgId && dto.entity_id !== orgId) {
      throw new ForbiddenException('Organization share must target the active organization')
    }
    return this.repo.upsertSpaceViewShare(supabase, {
      space_id: spaceId,
      view_id: viewId,
      org_id: space.org_id,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      level: dto.level,
      created_by: userId,
    })
  }

  async deleteSpaceViewShare(
    supabase: SupabaseClient,
    spaceId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.repo.deleteSpaceViewShare(supabase, spaceId, shareId, orgId)
  }

  async setSpaceVisibility(
    supabase: SupabaseClient,
    spaceId: string,
    visibility: 'private' | 'team',
    orgId?: string | null,
  ): Promise<SpaceRow> {
    return this.repo.setSpaceVisibility(supabase, spaceId, visibility, orgId)
  }

  async listItemShares(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow[]> {
    return this.repo.listItemShares(supabase, spaceId, itemId, orgId)
  }

  async upsertItemShare(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    itemId: string,
    dto: UpsertSpaceItemShareDto,
    orgId?: string | null,
  ): Promise<SpaceItemShareRow> {
    const item = await this.repo.loadItem(supabase, spaceId, itemId)
    if (!item) throw new ForbiddenException('Space item not found')
    if (dto.entity_type === 'org' && orgId && dto.entity_id !== orgId) {
      throw new ForbiddenException('Organization share must target the active organization')
    }
    return this.repo.upsertItemShare(supabase, {
      item_id: itemId,
      space_id: spaceId,
      org_id: item.org_id,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      level: dto.level,
      inherit_to_children: dto.inherit_to_children ?? true,
      created_by: userId,
    })
  }

  async deleteItemShare(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.repo.deleteItemShare(supabase, spaceId, itemId, shareId, orgId)
  }

  async enableItemShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    shareToken: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.repo.updateItemShareLink(
      supabase,
      spaceId,
      itemId,
      { share_link_enabled: true, share_token: shareToken },
      orgId,
    )
  }

  async disableItemShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.repo.updateItemShareLink(
      supabase,
      spaceId,
      itemId,
      { share_link_enabled: false, share_token: null },
      orgId,
    )
  }

  async enableSpaceShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    const existing = await this.repo.loadSpace(supabase, spaceId, orgId)
    if (!existing) throw new ForbiddenException('Space not found')
    return this.repo.updateSpaceShareLink(
      supabase,
      spaceId,
      { share_link_enabled: true, share_token: existing.share_token ?? randomUUID() },
      orgId,
    )
  }

  async disableSpaceShareLink(
    supabase: SupabaseClient,
    spaceId: string,
    orgId?: string | null,
  ): Promise<{ share_link_enabled: boolean; share_token: string | null }> {
    return this.repo.updateSpaceShareLink(
      supabase,
      spaceId,
      { share_link_enabled: false, share_token: null },
      orgId,
    )
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
    const item = await this.repo.loadItem(supabase, spaceId, itemId)
    if (!item) throw new ForbiddenException('Space item not found')

    const normalizedEmail = email.trim().toLowerCase()
    await this.repo.deleteItemEmailInvite(supabase, spaceId, itemId, normalizedEmail, orgId)
    return this.repo.createItemEmailInvite(supabase, {
      item_id: itemId,
      space_id: spaceId,
      org_id: item.org_id,
      entity_type: 'email',
      entity_id: randomUUID(),
      level,
      inherit_to_children: true,
      created_by: userId,
      invite_token: randomUUID(),
      invited_email: normalizedEmail,
      invite_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }
}
