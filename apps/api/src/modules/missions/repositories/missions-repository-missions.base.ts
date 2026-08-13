import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentKey, MissionStatus } from '../types/missions.types'
import { MissionsRepositoryBase } from './missions-repository.base'
import type {
  CreateMissionRecordInput,
  InsertMissionOutboxEventInput,
  UpdateMissionFieldsInput,
  UpdateMissionStatusInput,
} from './missions-repository.shared'

export abstract class MissionsRepositoryMissionsBase extends MissionsRepositoryBase {
  async insertMissionOutboxEvent(supabase: SupabaseClient, input: InsertMissionOutboxEventInput) {
    const requeue = input.requeue_existing_dedupe_key === true
    const { data, error } = await supabase
      .from('mission_outbox')
      .upsert(
        {
          mission_id: input.mission_id,
          user_id: input.user_id,
          org_id: input.org_id ?? null,
          event_type: input.event_type,
          dedupe_key: input.dedupe_key,
          payload: input.payload || {},
          max_attempts: input.max_attempts ?? 8,
          next_attempt_at: input.next_attempt_at || new Date().toISOString(),
          priority_rank: input.priority_rank ?? 3,
          status: 'pending',
          attempts: 0,
          error: null,
          locked_at: null,
          processed_at: null,
        },
        { onConflict: 'dedupe_key', ignoreDuplicates: !requeue },
      )
      .select('*')
      .maybeSingle()

    if (error) throw new Error(`Failed to insert mission outbox event: ${error.message}`)
    return data
  }

  async createMission(supabase: SupabaseClient, input: CreateMissionRecordInput) {
    const { data, error } = await supabase.from('missions').insert(input).select('*').single()
    if (error) throw new Error(`Failed to create mission: ${error.message}`)
    return data
  }

  async findMissionById(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ) {
    const { data, error } = await this.applyOwnerScope(
      supabase.from('missions').select('*').eq('id', missionId),
      userId,
      orgId,
    ).maybeSingle()
    if (error) throw new Error(`Failed to fetch mission: ${error.message}`)
    if (!data) throw new Error('Mission not found')
    return data
  }

  async deleteMission(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId?: string | null,
  ) {
    const { data: missionMeta, error: missionMetaError } = await this.applyOwnerScope(
      supabase.from('missions').select('campaign_id').eq('id', missionId),
      userId,
      orgId,
    ).maybeSingle()
    if (missionMetaError)
      throw new Error(`Failed mission lookup for delete: ${missionMetaError.message}`)

    const { error } = await this.applyOwnerScope(
      supabase.from('missions').delete().eq('id', missionId),
      userId,
      orgId,
    )
    if (error) throw new Error(`Failed to delete mission: ${error.message}`)
    await this.syncCampaignActiveWork(supabase, missionMeta?.campaign_id ?? null, userId, orgId)
    return { deleted: true }
  }

  async findMissionByIdempotencyKey(
    supabase: SupabaseClient,
    userId: string,
    key: string,
    orgId?: string | null,
  ) {
    const { data, error } = await this.applyOwnerScope(
      supabase.from('missions').select('*').eq('idempotency_key', key),
      userId,
      orgId,
    ).maybeSingle()
    if (error) throw new Error(`Failed idempotency lookup: ${error.message}`)
    return data
  }

  async findMissionSpaceForCreate(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load mission space: ${error.message}`)
    return data as { id: string; campaign_id?: string | null } | null
  }

  async findCampaignOwnerForCreate(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load campaign owner: ${error.message}`)
    return data as { user_id?: string | null } | null
  }

  async touchProfileLastInteraction(
    supabase: SupabaseClient,
    userId: string,
    lastInteractionAt: string,
  ) {
    await supabase
      .from('profiles')
      .update({ last_interaction_at: lastInteractionAt })
      .eq('id', userId)
  }

  async listMissions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    opts?: {
      status?: MissionStatus
      campaign_id?: string
      space_id?: string
      agent_keys?: string[]
      limit?: number
    },
  ) {
    const status = typeof opts === 'object' && opts !== null ? opts.status : undefined
    const campaignId = typeof opts === 'object' && opts !== null ? opts.campaign_id : undefined
    const spaceId = typeof opts === 'object' && opts !== null ? opts.space_id : undefined
    const agentKeys = typeof opts === 'object' && opts !== null ? opts.agent_keys : undefined
    const limit = typeof opts === 'object' && opts !== null ? (opts.limit ?? 30) : 30

    if (agentKeys && agentKeys.length > 0) {
      return this.listMissionsForAgents(supabase, userId, orgId, agentKeys, {
        status,
        campaignId,
        spaceId,
        limit,
      })
    }

    let query = this.applyOwnerScope(supabase.from('missions').select('*'), userId, orgId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (spaceId) query = query.eq('space_id', spaceId)
    query = query.limit(limit)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list missions: ${error.message}`)
    return data || []
  }

  /** Returns mission ids from the list that the user/org owns (for batch deliverables, etc.). */
  async filterOwnedMissionIds(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    missionIds: string[],
  ): Promise<string[]> {
    if (missionIds.length === 0) return []
    const { data, error } = await this.applyOwnerScope(
      supabase.from('missions').select('id').in('id', missionIds),
      userId,
      orgId,
    )
    if (error) throw new Error(`Failed to filter owned mission ids: ${error.message}`)
    return (data || []).map((r: { id: string }) => r.id)
  }

  async listMissionSharesForPermission(supabase: SupabaseClient, missionId: string) {
    const { data, error } = await supabase
      .from('mission_shares')
      .select('entity_type, entity_id, org_id, level')
      .eq('mission_id', missionId)
    if (error) throw new Error(`Failed to list mission shares: ${error.message}`)
    return data || []
  }

  async findMissionCampaignForPermission(supabase: SupabaseClient, campaignId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .maybeSingle()
    if (error) throw new Error(`Failed to verify campaign access: ${error.message}`)
    return data ?? null
  }

  private async listMissionsForAgents(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKeys: string[],
    opts: { status?: MissionStatus; campaignId?: string; spaceId?: string; limit: number },
  ) {
    const orFilters = [
      `assigned_agent_key.in.(${agentKeys.join(',')})`,
      `current_agent_key.in.(${agentKeys.join(',')})`,
    ]
    let query = this.applyOwnerScope(supabase.from('missions').select('*'), userId, orgId)
      .or(orFilters.join(','))
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
    if (opts.status) query = query.eq('status', opts.status)
    if (opts.campaignId) query = query.eq('campaign_id', opts.campaignId)
    if (opts.spaceId) query = query.eq('space_id', opts.spaceId)
    query = query.limit(opts.limit)
    const { data: directMatches, error } = await query
    if (error) throw new Error(`Failed to list missions for agents: ${error.message}`)

    const { data: subtaskMissionIds, error: subtaskError } = await this.applyOwnerScope(
      supabase.from('mission_subtasks').select('mission_id'),
      userId,
      orgId,
    ).in('assigned_agent_key', agentKeys)
    if (subtaskError) throw new Error(`Failed to list subtask missions: ${subtaskError.message}`)

    const directIds = new Set((directMatches || []).map((m: { id: string }) => m.id))
    const extraIds = (subtaskMissionIds || [])
      .map((r: { mission_id: string }) => r.mission_id)
      .filter((id: string) => !directIds.has(id))

    if (extraIds.length === 0) return directMatches || []

    let extraQuery = this.applyOwnerScope(supabase.from('missions').select('*'), userId, orgId).in(
      'id',
      extraIds,
    )
    if (opts.status) extraQuery = extraQuery.eq('status', opts.status)
    if (opts.campaignId) extraQuery = extraQuery.eq('campaign_id', opts.campaignId)
    if (opts.spaceId) extraQuery = extraQuery.eq('space_id', opts.spaceId)
    const { data: extraMissions, error: extraError } = await extraQuery
    if (extraError) throw new Error(`Failed to load subtask missions: ${extraError.message}`)

    const merged = [...(directMatches || []), ...(extraMissions || [])]
    merged.sort((a: { updated_at: string }, b: { updated_at: string }) =>
      b.updated_at > a.updated_at ? 1 : b.updated_at < a.updated_at ? -1 : 0,
    )
    return merged.slice(0, opts.limit)
  }

  async bulkUpdateMissions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    updates: Array<{ id: string; status?: string; sort_order?: number }>,
  ) {
    const results = await Promise.all(
      updates.map(async (u) => {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }
        if (u.status !== undefined) updateData.status = u.status
        if (u.sort_order !== undefined) updateData.sort_order = u.sort_order
        if (u.status === 'done') updateData.completed_at = new Date().toISOString()
        else if (u.status) updateData.completed_at = null

        const { data, error } = await this.applyOwnerScope(
          supabase.from('missions').update(updateData).eq('id', u.id),
          userId,
          orgId,
        )
          .select('*')
          .single()

        if (error) return null
        return data
      }),
    )
    return results.filter(Boolean)
  }

  async updateMissionStatus(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
    input: UpdateMissionStatusInput,
  ) {
    const { data: missionMeta, error: missionMetaError } = await this.applyOwnerScope(
      supabase.from('missions').select('campaign_id').eq('id', missionId),
      userId,
      orgId,
    ).maybeSingle()
    if (missionMetaError)
      throw new Error(`Failed mission lookup for status update: ${missionMetaError.message}`)

    const updates: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
    }
    if (input.error !== undefined) updates.error = input.error
    if (input.output !== undefined) updates.output = input.output
    if (input.assigned_agent_key !== undefined)
      updates.assigned_agent_key = input.assigned_agent_key
    if (input.current_agent_key !== undefined) updates.current_agent_key = input.current_agent_key
    if (input.retry_count !== undefined) updates.retry_count = input.retry_count
    if (input.progress_notes !== undefined) updates.progress_notes = input.progress_notes
    if (input.plan_id !== undefined) updates.plan_id = input.plan_id
    if (input.status === 'in_progress') updates.started_at = new Date().toISOString()
    if (input.status === 'done' || input.status === 'error' || input.status === 'failed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await this.applyOwnerScope(
      supabase.from('missions').update(updates).eq('id', missionId),
      userId,
      orgId,
    )
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update mission: ${error.message}`)
    await this.syncCampaignActiveWork(
      supabase,
      (data?.campaign_id as string | null | undefined) ?? missionMeta?.campaign_id ?? null,
      userId,
      orgId,
    )
    return data
  }

  async updateMissionFields(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
    input: UpdateMissionFieldsInput,
  ) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.title !== undefined) updates.title = input.title
    if (input.brief !== undefined) updates.brief = input.brief
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.assigned_agent_key !== undefined)
      updates.assigned_agent_key = input.assigned_agent_key
    if (input.current_agent_key !== undefined) updates.current_agent_key = input.current_agent_key
    if (input.progress_notes !== undefined) updates.progress_notes = input.progress_notes
    if (input.scheduled_at !== undefined) updates.scheduled_at = input.scheduled_at

    const { data, error } = await this.applyOwnerScope(
      supabase.from('missions').update(updates).eq('id', missionId),
      userId,
      orgId,
    )
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update mission fields: ${error.message}`)
    return data
  }
}
