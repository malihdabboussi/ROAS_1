import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SpaceAssetIndexInput,
  SpaceSemanticSourceType,
} from '../../../spaces-retrieval/types/space-retrieval.types'

export type BackfillSpaceScope = {
  spaceId: string
  userId: string
  orgId: string | null
  campaignId: string | null
}

type ResolveBackfillSpacesInput = {
  explicitSpaceIds: string[]
  userIds: string[]
  orgIds: string[]
  includePersonal: boolean
  spaceLimit: number
  defaultSpaceId: string
  defaultUserId: string
  defaultOrgId: string
}

type CollectIndexJobsInput = {
  spaceId: string
  userId: string
  orgId: string | null
  limit: number
  sourceAllowlist: Set<string>
  handleAllowlist: Set<string>
}

function spaceItemSourceType(customData: Record<string, unknown> | null): SpaceSemanticSourceType {
  if (customData?._view_type === 'doc') return 'space_doc'
  if (customData?._view_type === 'instagram_research') return 'instagram_research_item'
  if (customData?._view_type === 'tiktok_research') return 'tiktok_research_item'
  if (customData?._view_type === 'youtube_research') return 'youtube_research_item'
  if (customData?._view_type === 'twitter_research') return 'twitter_research_item'
  return 'space_task'
}

function sourceAllowed(sourceType: SpaceSemanticSourceType, allowlist: Set<string>): boolean {
  return allowlist.size === 0 || allowlist.has(sourceType)
}

function chunks<T>(values: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    out.push(values.slice(index, index + size))
  }
  return out
}

export class SpaceRetrievalBackfillRepository {
  async resolveBackfillSpaces(
    supabase: SupabaseClient,
    input: ResolveBackfillSpacesInput,
  ): Promise<BackfillSpaceScope[]> {
    if (
      input.explicitSpaceIds.length === 0 &&
      input.userIds.length === 0 &&
      input.orgIds.length === 0
    ) {
      return [
        {
          spaceId: input.defaultSpaceId,
          userId: input.defaultUserId,
          orgId: input.defaultOrgId,
          campaignId: null,
        },
      ]
    }

    let query = supabase
      .from('spaces')
      .select('id, user_id, org_id, campaign_id')
      .eq('is_template', false)
      .limit(input.spaceLimit)

    const filters: string[] = []
    if (input.explicitSpaceIds.length > 0) {
      filters.push(`id.in.(${input.explicitSpaceIds.join(',')})`)
    }
    if (input.includePersonal && input.userIds.length > 0) {
      filters.push(`and(user_id.in.(${input.userIds.join(',')}),org_id.is.null)`)
    }
    if (input.orgIds.length > 0) filters.push(`org_id.in.(${input.orgIds.join(',')})`)
    if (filters.length > 0) query = query.or(filters.join(','))

    const { data, error } = await query
    if (error) throw new Error(`resolve spaces: ${error.message}`)

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      spaceId: String(row.id),
      userId: String(row.user_id),
      orgId: typeof row.org_id === 'string' ? row.org_id : null,
      campaignId: typeof row.campaign_id === 'string' ? row.campaign_id : null,
    }))
  }

  async collectIndexJobs(
    supabase: SupabaseClient,
    input: CollectIndexJobsInput,
  ): Promise<SpaceAssetIndexInput[]> {
    const jobs: SpaceAssetIndexInput[] = [
      { sourceType: 'space', sourceId: input.spaceId, userId: input.userId, orgId: input.orgId },
    ]

    const { data: spaceRows, error: spaceRowsError } = await supabase
      .from('spaces')
      .select('id, org_id, campaign_id, schema')
      .eq('id', input.spaceId)
    if (spaceRowsError) throw new Error(`spaces views: ${spaceRowsError.message}`)
    const campaignId =
      typeof (spaceRows?.[0] as Record<string, unknown> | undefined)?.campaign_id === 'string'
        ? String((spaceRows?.[0] as Record<string, unknown>).campaign_id)
        : null
    for (const space of (spaceRows ?? []) as Array<Record<string, unknown>>) {
      const schema = space.schema as { views?: Array<Record<string, unknown>> } | null
      for (const view of schema?.views ?? []) {
        if (!view.id) continue
        const sourceId = `${input.spaceId}:${String(view.id)}`
        jobs.push({
          sourceType: 'space_view',
          sourceId,
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
          row: {
            id: sourceId,
            space_id: input.spaceId,
            campaign_id: space.campaign_id ?? null,
            org_id: space.org_id ?? input.orgId,
            title: view.name,
            view,
          },
        })
      }
    }

    const { data: items, error: itemsError } = await supabase
      .from('space_items')
      .select('id, custom_data')
      .eq('space_id', input.spaceId)
      .limit(input.limit)
    if (itemsError) throw new Error(`space_items: ${itemsError.message}`)
    for (const row of (items ?? []) as Array<{
      id: string
      custom_data: Record<string, unknown> | null
    }>) {
      const handle = String(row.custom_data?._handle ?? '').toLowerCase()
      if (input.handleAllowlist.size > 0 && handle && !input.handleAllowlist.has(handle)) continue
      jobs.push({
        sourceType: spaceItemSourceType(row.custom_data),
        sourceId: row.id,
        userId: input.userId,
        orgId: input.orgId,
      })
      const sourceId = row.custom_data?._source_id
      if (typeof sourceId === 'string' && sourceId.trim()) {
        jobs.push({
          sourceType: 'conversation_document',
          sourceId: sourceId.trim(),
          userId: input.userId,
          orgId: input.orgId,
        })
      }
    }

    await this.collectMissionJobs(supabase, input, items ?? [], jobs)
    await this.collectRelatedTableJobs(supabase, input, campaignId, jobs)

    const seen = new Set<string>()
    return jobs.filter((job) => {
      const key = `${job.sourceType}:${job.sourceId}`
      if (seen.has(key)) return false
      if (!sourceAllowed(job.sourceType, input.sourceAllowlist)) return false
      seen.add(key)
      return true
    })
  }

  async countChunks(
    supabase: SupabaseClient,
    spaceIds: string[],
  ): Promise<{ count: number; error: { message: string } | null }> {
    let query = supabase.from('space_semantic_chunks').select('id', { count: 'exact', head: true })
    if (spaceIds.length === 1) query = query.eq('space_id', spaceIds[0])
    else if (spaceIds.length > 1) query = query.in('space_id', spaceIds)
    const { count, error } = await query
    return { count: count ?? 0, error }
  }

  private async collectMissionJobs(
    supabase: SupabaseClient,
    input: CollectIndexJobsInput,
    items: Array<{ id: string }>,
    jobs: SpaceAssetIndexInput[],
  ): Promise<void> {
    const missionIds = new Set<string>()
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select('id')
      .eq('space_id', input.spaceId)
      .limit(input.limit)
    if (missionsError) throw new Error(`missions: ${missionsError.message}`)
    for (const row of (missions ?? []) as Array<{ id: string }>) missionIds.add(row.id)

    const { data: linkedItems, error: linkedItemsError } = await supabase
      .from('space_items')
      .select('linked_mission_id, custom_data')
      .eq('space_id', input.spaceId)
      .not('linked_mission_id', 'is', null)
      .limit(input.limit)
    if (linkedItemsError)
      throw new Error(`space_items linked missions: ${linkedItemsError.message}`)
    for (const row of (linkedItems ?? []) as Array<{
      linked_mission_id: string | null
      custom_data: Record<string, unknown> | null
    }>) {
      if (typeof row.linked_mission_id === 'string' && row.linked_mission_id.trim()) {
        missionIds.add(row.linked_mission_id.trim())
      }
      const customMissionId = row.custom_data?.mission_id
      if (typeof customMissionId === 'string' && customMissionId.trim()) {
        missionIds.add(customMissionId.trim())
      }
    }

    for (const missionId of missionIds) {
      jobs.push({
        sourceType: 'mission',
        sourceId: missionId,
        userId: input.userId,
        orgId: input.orgId,
        spaceId: input.spaceId,
      })
    }
    if (missionIds.size > 0)
      await this.collectMissionChildJobs(supabase, input, [...missionIds], jobs)
    await this.collectActivityAndDeliverableJobs(supabase, input, items, jobs)
  }

  private async collectMissionChildJobs(
    supabase: SupabaseClient,
    input: CollectIndexJobsInput,
    missionIds: string[],
    jobs: SpaceAssetIndexInput[],
  ): Promise<void> {
    const { data: subtasks, error: subtasksError } = await supabase
      .from('mission_subtasks')
      .select('id')
      .in('mission_id', missionIds)
      .limit(input.limit)
    if (subtasksError) throw new Error(`mission_subtasks: ${subtasksError.message}`)
    for (const row of (subtasks ?? []) as Array<{ id: string }>) {
      jobs.push({
        sourceType: 'mission_subtask',
        sourceId: row.id,
        userId: input.userId,
        orgId: input.orgId,
      })
    }

    const { data: deliverables, error: deliverablesError } = await supabase
      .from('mission_deliverables')
      .select('id')
      .in('mission_id', missionIds)
      .limit(input.limit)
    if (deliverablesError) throw new Error(`mission_deliverables: ${deliverablesError.message}`)
    for (const row of (deliverables ?? []) as Array<{ id: string }>) {
      jobs.push({
        sourceType: 'mission_deliverable',
        sourceId: row.id,
        userId: input.userId,
        orgId: input.orgId,
      })
    }
  }

  private async collectActivityAndDeliverableJobs(
    supabase: SupabaseClient,
    input: CollectIndexJobsInput,
    items: Array<{ id: string }>,
    jobs: SpaceAssetIndexInput[],
  ): Promise<void> {
    const itemIds = items.map((row) => row.id)
    for (const batch of chunks(itemIds, 100)) {
      const { data: activity, error: activityError } = await supabase
        .from('space_item_activity')
        .select('id')
        .in('item_id', batch)
        .limit(input.limit)
      if (activityError) throw new Error(`space_item_activity: ${activityError.message}`)
      for (const row of (activity ?? []) as Array<{ id: string }>) {
        jobs.push({
          sourceType: 'space_activity',
          sourceId: row.id,
          userId: input.userId,
          orgId: input.orgId,
        })
      }
    }

    const { data: spaceDeliverables, error: spaceDeliverablesError } = await supabase
      .from('space_item_deliverables')
      .select('id')
      .eq('space_id', input.spaceId)
      .limit(input.limit)
    if (spaceDeliverablesError)
      throw new Error(`space_item_deliverables: ${spaceDeliverablesError.message}`)
    for (const row of (spaceDeliverables ?? []) as Array<{ id: string }>) {
      jobs.push({
        sourceType: 'space_deliverable',
        sourceId: row.id,
        userId: input.userId,
        orgId: input.orgId,
      })
    }
  }

  private async collectRelatedTableJobs(
    supabase: SupabaseClient,
    input: CollectIndexJobsInput,
    campaignId: string | null,
    jobs: SpaceAssetIndexInput[],
  ): Promise<void> {
    const relatedTables: Array<{ sourceType: SpaceSemanticSourceType; table: string }> = [
      { sourceType: 'contact', table: 'contacts' },
      { sourceType: 'media_asset', table: 'media_assets' },
      { sourceType: 'funnel', table: 'funnels' },
      { sourceType: 'form', table: 'forms' },
      { sourceType: 'offer', table: 'offers' },
      { sourceType: 'email', table: 'emails' },
      { sourceType: 'sequence', table: 'sequences' },
      { sourceType: 'presentation', table: 'presentations' },
      { sourceType: 'avatar', table: 'avatars' },
      { sourceType: 'social_post', table: 'social_posts' },
      { sourceType: 'ad_campaign', table: 'ad_campaigns' },
      { sourceType: 'ad_set', table: 'ad_sets' },
      { sourceType: 'ad', table: 'ads' },
      { sourceType: 'blog_post', table: 'blog_posts' },
    ]
    for (const spec of relatedTables) {
      let query = supabase.from(spec.table).select('id').limit(input.limit)
      if (spec.table === 'contacts') {
        if (!campaignId) continue
        query = query.eq('campaign_id', campaignId)
      } else if (campaignId) {
        query = query.or(`space_id.eq.${input.spaceId},campaign_id.eq.${campaignId}`)
      } else {
        query = query.eq('space_id', input.spaceId)
      }
      const { data, error } = await query
      if (error) continue
      for (const row of (data ?? []) as Array<{ id: string }>) {
        jobs.push({
          sourceType: spec.sourceType,
          sourceId: row.id,
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
        })
      }
    }
  }
}

export const spaceRetrievalBackfillRepository = new SpaceRetrievalBackfillRepository()
