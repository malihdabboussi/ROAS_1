import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskRollupItem } from '../dto/task-rollup.dto'

type CampaignRow = {
  id: string
  name: string | null
  program_id: string | null
}

type SpaceRow = {
  id: string
  title: string | null
  campaign_id: string | null
}

type SpaceItemRow = {
  id: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
  start_date: string | null
  due_date: string | null
  assignee_type: string | null
  assignee_id: string | null
  assignees: unknown
  space_id: string
  created_at: string
  updated_at: string | null
  suggestion_state: string | null
  parent_item_id: string | null
  description: string | null
  notes: string | null
  source: 'manual' | 'agent' | 'agent_suggested' | 'template' | 'fathom'
  linked_mission_id: string | null
  custom_data: Record<string, unknown> | null
  org_id: string
  user_id: string
  sort_order: number
}

type ProgramRow = { id: string; name: string }

@Injectable()
export class TaskRollupRepository {
  async listCampaigns(
    supabase: SupabaseClient,
    input: {
      orgId?: string | null
      programId?: string
      campaignId?: string
    },
  ): Promise<CampaignRow[]> {
    let query = supabase
      .from('campaigns')
      .select('id, name, program_id')
      .is('deleted_at', null)
      .neq('status', 'archived')

    if (input.orgId) query = query.eq('org_id', input.orgId)
    else query = query.is('org_id', null)

    if (input.programId) query = query.eq('program_id', input.programId)
    if (input.campaignId) query = query.eq('id', input.campaignId)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list rollup campaigns: ${error.message}`)
    return (data ?? []) as CampaignRow[]
  }

  async listSpacesForCampaigns(
    supabase: SupabaseClient,
    campaignIds: string[],
  ): Promise<SpaceRow[]> {
    if (campaignIds.length === 0) return []
    const { data, error } = await supabase
      .from('spaces')
      .select('id, title, campaign_id')
      .in('campaign_id', campaignIds)
    if (error) throw new Error(`Failed to list rollup spaces: ${error.message}`)
    return (data ?? []) as SpaceRow[]
  }

  async listOpenSpaceItems(
    supabase: SupabaseClient,
    input: {
      spaceIds: string[]
      orgId?: string | null
      assigneeUserId?: string
      excludeNeedsReview: boolean
      limit: number
    },
  ): Promise<SpaceItemRow[]> {
    if (input.spaceIds.length === 0) return []

    let query = supabase
      .from('space_items')
      .select(
        'id, title, status, priority, start_date, due_date, assignee_type, assignee_id, assignees, space_id, description, notes, source, linked_mission_id, custom_data, org_id, user_id, sort_order, created_at, updated_at, suggestion_state, parent_item_id',
      )
      .in('space_id', input.spaceIds)
      .or('parent_item_id.is.null,custom_data->>entry_type.eq.follow_up')
      .not('status', 'in', '(done,archived)')

    if (input.orgId) query = query.eq('org_id', input.orgId)
    else query = query.is('org_id', null)

    if (input.assigneeUserId) {
      const assigneesMatch = JSON.stringify([{ type: 'human', id: input.assigneeUserId }])
      query = query.contains('assignees', assigneesMatch)
    }

    if (input.excludeNeedsReview) {
      query = query.or(
        'custom_data->action_lifecycle->>review_state.is.null,custom_data->action_lifecycle->>review_state.neq.needs_review',
      )
    }

    const { data, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(input.limit)
    if (error) throw new Error(`Failed to list rollup items: ${error.message}`)
    return (data ?? []) as SpaceItemRow[]
  }

  async listProgramsByIds(supabase: SupabaseClient, programIds: string[]): Promise<ProgramRow[]> {
    if (programIds.length === 0) return []
    const { data, error } = await supabase
      .from('programs')
      .select('id, name')
      .in('id', programIds)
      .is('deleted_at', null)
    if (error) throw new Error(`Failed to list rollup programs: ${error.message}`)
    return (data ?? []) as ProgramRow[]
  }

  mapItems(input: {
    items: SpaceItemRow[]
    spacesById: Map<string, SpaceRow>
    campaignsById: Map<string, CampaignRow>
    programsById: Map<string, ProgramRow>
  }): TaskRollupItem[] {
    return input.items.map((item) => {
      const space = input.spacesById.get(item.space_id)
      const campaignId = space?.campaign_id ?? null
      const campaign = campaignId ? input.campaignsById.get(campaignId) : undefined
      const programId = campaign?.program_id ?? null
      const program = programId ? input.programsById.get(programId) : undefined
      const assignees = normalizeAssignees(item.assignees, item.assignee_type, item.assignee_id)
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        due_at: item.due_date,
        start_date: item.start_date,
        assignee_type:
          item.assignee_type === 'human' || item.assignee_type === 'agent'
            ? item.assignee_type
            : 'unassigned',
        assignee_id: item.assignee_id,
        assignee_user_id:
          item.assignee_type === 'human' && item.assignee_id ? item.assignee_id : null,
        assignees,
        space_id: item.space_id,
        space_title: space?.title ?? 'Space',
        campaign_id: campaignId,
        campaign_name: campaign?.name ?? null,
        program_id: programId,
        program_name: program?.name ?? null,
        source_url: `/spaces?space=${encodeURIComponent(item.space_id)}&item=${encodeURIComponent(item.id)}`,
        description: item.description,
        notes: item.notes,
        source: item.source,
        linked_mission_id: item.linked_mission_id,
        custom_data: item.custom_data ?? {},
        org_id: item.org_id,
        user_id: item.user_id,
        sort_order: item.sort_order,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    })
  }
}

function normalizeAssignees(
  raw: unknown,
  assigneeType: string | null,
  assigneeId: string | null,
): Array<{ type: 'human' | 'agent'; id: string }> {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const type = (entry as { type?: unknown }).type
        const id = (entry as { id?: unknown }).id
        if ((type === 'human' || type === 'agent') && typeof id === 'string' && id.length > 0) {
          return { type, id }
        }
        return null
      })
      .filter((entry): entry is { type: 'human' | 'agent'; id: string } => !!entry)
  }
  if ((assigneeType === 'human' || assigneeType === 'agent') && assigneeId) {
    return [{ type: assigneeType, id: assigneeId }]
  }
  return []
}
