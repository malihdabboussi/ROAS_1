import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope, resolveScopedOrgId } from '@vibey/api-shared'
import type { CreateSpaceDto, SpaceQuery, UpdateSpaceDto } from '../dto'
import {
  SpaceItemActivityRepository,
  type SpaceItemActivityInput,
} from './space-item-activity.repository'
import { SpaceItemsRepository } from './space-items.repository'
import { SpaceViewOverridesRepository } from './space-view-overrides.repository'

const SHARE_LEVEL_WEIGHT: Record<string, number> = {
  view: 1,
  edit: 2,
  admin: 3,
}

type SpaceListCursor = {
  updated_at: string
  id: string
}

function encodeSpaceListCursor(space: SpaceListCursor): string {
  return Buffer.from(JSON.stringify({ updated_at: space.updated_at, id: space.id })).toString(
    'base64',
  )
}

function decodeSpaceListCursor(cursor: string): SpaceListCursor {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Partial<
      SpaceListCursor
    >
    if (typeof value.updated_at !== 'string' || typeof value.id !== 'string') {
      throw new Error('Invalid cursor')
    }
    return { updated_at: value.updated_at, id: value.id }
  } catch {
    throw new BadRequestException('Invalid spaces cursor')
  }
}

@Injectable()
export class SpacesRepository extends SpaceItemsRepository {
  constructor(
    private readonly activityRepository: SpaceItemActivityRepository = new SpaceItemActivityRepository(),
    private readonly viewOverridesRepository: SpaceViewOverridesRepository = new SpaceViewOverridesRepository(),
  ) {
    super()
  }

  private applyOwnerScope(query: any, userId: string, orgId?: string | null) {
    return applyOwnerScope(query, { userId, orgId: orgId ?? null })
  }

  private applySpaceListFilters(query: any, spaceQuery: SpaceQuery) {
    if (spaceQuery.general) return query.is('campaign_id', null)
    if (spaceQuery.campaign_id) return query.eq('campaign_id', spaceQuery.campaign_id)
    return query
  }

  async findAllSpaces(
    supabase: SupabaseClient,
    userId: string,
    query: SpaceQuery,
    orgId?: string | null,
  ) {
    let q = supabase
      .from('spaces')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(query.limit ?? 50)
    q = this.applyOwnerScope(q, userId, orgId)
    q = this.applySpaceListFilters(q, query)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async findSpacesPage(
    supabase: SupabaseClient,
    userId: string,
    query: SpaceQuery,
    orgId?: string | null,
  ) {
    const limit = query.limit ?? 50
    let q = supabase
      .from('spaces')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1)
    q = this.applyOwnerScope(q, userId, orgId)
    q = this.applySpaceListFilters(q, query)
    if (query.cursor) {
      const cursor = decodeSpaceListCursor(query.cursor)
      q = q.or(
        `updated_at.lt.${cursor.updated_at},and(updated_at.eq.${cursor.updated_at},id.lt.${cursor.id})`,
      )
    }

    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)

    const rows = data ?? []
    const items = rows.slice(0, limit)
    const next_cursor =
      rows.length > limit && items.length > 0
        ? encodeSpaceListCursor(items[items.length - 1]!)
        : null

    return { items, next_cursor }
  }

  async findSharedWithMe(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    if (!orgId) return []

    const sharesQuery = supabase
      .from('space_shares')
      .select('space_id, entity_type, entity_id, level, allowed_view_ids, created_at')
      .order('created_at', { ascending: false })
      .or(
        `and(entity_type.eq.user,entity_id.eq.${userId}),and(entity_type.eq.org,entity_id.eq.${orgId})`,
      )

    const { data: shareRows, error: shareError } = await sharesQuery
    if (shareError) throw new BadRequestException(shareError.message)

    const shares = (shareRows ?? []) as Array<{
      space_id: string
      level: string
      allowed_view_ids: string[] | null
      created_at: string
    }>
    const spaceIds = [...new Set(shares.map((share) => share.space_id).filter(Boolean))]
    if (spaceIds.length === 0) return []

    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .in('id', spaceIds)
    if (spacesError) throw new BadRequestException(spacesError.message)

    return (spaces ?? [])
      .filter((space: any) => {
        if (space.user_id === userId) return false
        if (orgId && space.org_id === orgId && space.visibility === 'team') return false
        return true
      })
      .map((space: any) => {
        const matching = shares.filter((share) => share.space_id === space.id)
        const best = matching
          .slice()
          .sort(
            (a, b) => (SHARE_LEVEL_WEIGHT[b.level] ?? 0) - (SHARE_LEVEL_WEIGHT[a.level] ?? 0),
          )[0]
        const unrestricted = matching.some((share) => share.allowed_view_ids == null)
        const allowed = unrestricted
          ? null
          : [
              ...new Set(
                matching.flatMap((share) =>
                  (share.allowed_view_ids ?? []).filter(
                    (id) => typeof id === 'string' && id.length > 0,
                  ),
                ),
              ),
            ]
        return {
          ...space,
          share_meta: {
            level: best?.level ?? 'view',
            allowed_view_ids: allowed,
          },
        }
      })
  }

  async findSpaceById(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
  ) {
    let q = supabase.from('spaces').select('*').eq('id', spaceId)
    q = this.applyOwnerScope(q, userId, orgId)
    const { data, error } = await q.maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findSpaceByIdForAccess(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findSpacesByCampaignForOwner(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string | null,
    orgId?: string | null,
  ) {
    let q = supabase
      .from('spaces')
      .select('*')
      .eq('is_template', false)
      .order('updated_at', { ascending: false })
    q = this.applyOwnerScope(q, userId, orgId)
    q = campaignId ? q.eq('campaign_id', campaignId) : q.is('campaign_id', null)
    const { data, error } = await q
    if (error) throw new BadRequestException(error.message)
    return data ?? []
  }

  async createSpace(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateSpaceDto,
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('spaces')
      .insert({ ...dto, user_id: userId, org_id: resolveScopedOrgId({ orgId: orgId ?? null }) })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async updateSpace(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    dto: UpdateSpaceDto,
    orgId?: string | null,
    opts?: { expectedUpdatedAt?: string },
  ) {
    let q = supabase.from('spaces').update(dto).eq('id', spaceId)
    q = this.applyOwnerScope(q, userId, orgId)
    if (opts?.expectedUpdatedAt) {
      q = q.eq('updated_at', opts.expectedUpdatedAt)
    }
    const { data, error } = await q.select().maybeSingle()
    if (error) throw new BadRequestException(error.message)
    if (!data) {
      if (opts?.expectedUpdatedAt) {
        throw new ConflictException(
          'Space was modified by another request — please reload and try again',
        )
      }
      throw new BadRequestException('Space not found')
    }
    return data
  }

  async deleteSpace(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
  ) {
    let q = supabase.from('spaces').delete().eq('id', spaceId)
    q = this.applyOwnerScope(q, userId, orgId)
    const { error } = await q
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }

  async findActivityByItemId(supabase: SupabaseClient, spaceId: string, itemId: string) {
    return this.activityRepository.findActivityByItemId(supabase, spaceId, itemId)
  }

  async findActivityById(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    activityId: string,
  ) {
    return this.activityRepository.findActivityById(supabase, spaceId, itemId, activityId)
  }

  async updateActivity(
    supabase: SupabaseClient,
    activityId: string,
    patch: { payload: Record<string, unknown> },
  ) {
    return this.activityRepository.updateActivity(supabase, activityId, patch)
  }

  async deleteActivity(supabase: SupabaseClient, activityId: string) {
    return this.activityRepository.deleteActivity(supabase, activityId)
  }

  async createActivity(supabase: SupabaseClient, input: SpaceItemActivityInput) {
    return this.activityRepository.createActivity(supabase, input)
  }

  async createActivities(supabase: SupabaseClient, inputs: SpaceItemActivityInput[]) {
    return this.activityRepository.createActivities(supabase, inputs)
  }

  async moveItemToSpace(
    supabase: SupabaseClient,
    itemId: string,
    sourceSpaceId: string,
    targetSpaceId: string,
  ) {
    const { data, error } = await supabase
      .from('space_items')
      .update({
        space_id: targetSpaceId,
        parent_item_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('space_id', sourceSpaceId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async moveItemsToSpace(
    supabase: SupabaseClient,
    itemIds: string[],
    sourceSpaceId: string,
    targetSpaceId: string,
  ): Promise<void> {
    if (itemIds.length === 0) return
    const { error } = await supabase
      .from('space_items')
      .update({ space_id: targetSpaceId, updated_at: new Date().toISOString() })
      .in('id', itemIds)
      .eq('space_id', sourceSpaceId)
    if (error) throw new BadRequestException(error.message)
  }

  async findChildItemIds(
    supabase: SupabaseClient,
    spaceId: string,
    parentItemIds: string[],
  ): Promise<string[]> {
    if (parentItemIds.length === 0) return []
    const { data, error } = await supabase
      .from('space_items')
      .select('id')
      .eq('space_id', spaceId)
      .in('parent_item_id', parentItemIds)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []).map((row: { id: string }) => row.id)
  }

  async updateSuggestionState(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    suggestionState: 'accepted' | 'dismissed',
  ) {
    const { data, error } = await supabase
      .from('space_items')
      .update({ suggestion_state: suggestionState, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('space_id', spaceId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async countRecentAgentSuggestions(
    supabase: SupabaseClient,
    spaceId: string,
    sinceIso: string,
  ): Promise<number> {
    const { count, error } = await supabase
      .from('space_items')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId)
      .eq('source', 'agent_suggested')
      .gte('created_at', sinceIso)
    if (error) throw new BadRequestException(error.message)
    return count ?? 0
  }

  async createMissionFromSpaceItem(supabase: SupabaseClient, mission: Record<string, unknown>) {
    const { data, error } = await supabase.from('missions').insert(mission).select().single()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, unknown>
  }

  async linkItemToMission(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    missionId: unknown,
  ) {
    const { data, error } = await supabase
      .from('space_items')
      .update({ linked_mission_id: missionId, status: 'in_progress' })
      .eq('id', itemId)
      .eq('space_id', spaceId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  // ---------------------------------------------------------------------------
  // View overrides (per-user personal view config)
  // ---------------------------------------------------------------------------

  async findViewOverrides(supabase: SupabaseClient, spaceId: string, userId: string) {
    return this.viewOverridesRepository.findViewOverrides(supabase, spaceId, userId)
  }

  async upsertViewOverride(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    viewId: string,
    overrides: Record<string, unknown>,
  ) {
    return this.viewOverridesRepository.upsertViewOverride(
      supabase,
      spaceId,
      userId,
      viewId,
      overrides,
    )
  }

  async deleteViewOverride(
    supabase: SupabaseClient,
    spaceId: string,
    userId: string,
    viewId: string,
  ) {
    return this.viewOverridesRepository.deleteViewOverride(supabase, spaceId, userId, viewId)
  }
}
