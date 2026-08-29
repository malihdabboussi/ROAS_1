import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'
import {
  applySpaceItemAssignedToMeFilter,
  applySpaceItemFilters,
  applySpaceItemOrder,
  applySpaceItemSearch,
  getSpaceItemSelect,
  shouldIncludeSpaceItemCount,
} from '../services/space-item-query.util'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null; count?: number | null }

export type ArtifactTaskActivityInput = {
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
  event_type: string
  payload: Record<string, unknown>
  actor_kind?: 'user' | 'agent' | 'automation' | 'system'
  agent_message_id?: string | null
  tool_call_id?: string | null
  snapshot?: Record<string, unknown> | null
}

@Injectable()
export class ArtifactTasksRepository {
  async listActiveOrgMemberProfiles(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await supabase
      .from('org_members')
      .select('user_id, profiles:profiles!org_members_user_id_fk_profiles(id, full_name, email)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .limit(500)) as QueryListResult<Record<string, unknown>>
  }

  async findActiveOrgMember(
    supabase: SupabaseClient,
    input: { orgId: string; userId: string },
  ): Promise<QueryResult<{ user_id: string }>> {
    return (await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', input.orgId)
      .eq('status', 'active')
      .eq('user_id', input.userId)
      .maybeSingle()) as QueryResult<{ user_id: string }>
  }

  async findProfile(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async findSpace(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async listCandidateTaskSpaces(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null; campaignId: string | null },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = supabase
      .from('spaces')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20)
    query = applyOwnerScope(query, { userId: input.userId, orgId: input.orgId })
    query = input.campaignId
      ? query.eq('campaign_id', input.campaignId)
      : query.is('campaign_id', null)
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async createSpace(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('spaces').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async updateSpaceSchema(
    supabase: SupabaseClient,
    input: { spaceId: string; schema: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('spaces')
      .update({ schema: input.schema })
      .eq('id', input.spaceId)) as { error: QueryError | null }
  }

  async listSpaces(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId: string | null
      campaignId: string | null
      general: boolean
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = supabase
      .from('spaces')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(input.limit)
    query = applyOwnerScope(query, { userId: input.userId, orgId: input.orgId })
    if (input.general) query = query.is('campaign_id', null)
    else if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async findTask(
    supabase: SupabaseClient,
    input: { spaceId: string; taskId: string },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('id', input.taskId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async listSpaceItems(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      queryInput: Record<string, unknown>
      additionalFilters?: Record<string, unknown>
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = shouldIncludeSpaceItemCount(input.queryInput)
      ? supabase
          .from('space_items')
          .select(getSpaceItemSelect(input.queryInput), { count: 'exact' })
      : supabase.from('space_items').select(getSpaceItemSelect(input.queryInput))
    query = query.eq('space_id', input.spaceId)
    query = applySpaceItemFilters(query, input.queryInput, input.additionalFilters ?? {})
    query = applySpaceItemSearch(query, input.queryInput)
    query = applySpaceItemOrder(query, input.queryInput, 'sort_order').limit(input.limit)
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async listTasks(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      queryInput: Record<string, unknown>
      userId: string
      closedStatusIds: Set<string>
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = shouldIncludeSpaceItemCount(input.queryInput)
      ? supabase
          .from('space_items')
          .select(getSpaceItemSelect(input.queryInput), { count: 'exact' })
      : supabase.from('space_items').select(getSpaceItemSelect(input.queryInput))
    query = query.eq('space_id', input.spaceId)
    query = applySpaceItemFilters(query, input.queryInput)
    query = applySpaceItemAssignedToMeFilter(query, input.queryInput, input.userId)
    query = applySpaceItemSearch(query, input.queryInput)
    if (input.queryInput.include_closed !== true && input.queryInput.include_closed !== 'true') {
      for (const closedId of input.closedStatusIds) query = query.neq('status', closedId)
    }
    query = applySpaceItemOrder(query, input.queryInput, 'sort_order').limit(input.limit)
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async listAssignedTasksAcrossSpaces(
    supabase: SupabaseClient,
    input: {
      queryInput: Record<string, unknown>
      userId: string
      orgId: string | null
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = shouldIncludeSpaceItemCount(input.queryInput)
      ? supabase
          .from('space_items')
          .select(getSpaceItemSelect(input.queryInput), { count: 'exact' })
      : supabase.from('space_items').select(getSpaceItemSelect(input.queryInput))
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    query = query.is('parent_item_id', null)
    query = applySpaceItemFilters(query, input.queryInput)
    query = applySpaceItemAssignedToMeFilter(query, input.queryInput, input.userId)
    query = applySpaceItemSearch(query, input.queryInput)
    query = applySpaceItemOrder(query, input.queryInput, 'due_date').limit(input.limit)
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async listSpacesByIds(
    supabase: SupabaseClient,
    spaceIds: string[],
  ): Promise<QueryListResult<Record<string, unknown>>> {
    if (spaceIds.length === 0) return { data: [], error: null }
    return (await supabase.from('spaces').select('*').in('id', spaceIds)) as QueryListResult<
      Record<string, unknown>
    >
  }

  async listSubtasks(
    supabase: SupabaseClient,
    input: { spaceId: string; parentItemId: string },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await supabase
      .from('space_items')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('parent_item_id', input.parentItemId)
      .order('sort_order', { ascending: true })) as QueryListResult<Record<string, unknown>>
  }

  async listActivity(
    supabase: SupabaseClient,
    input: { spaceId: string; itemId: string },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await supabase
      .from('space_item_activity')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('item_id', input.itemId)
      .order('created_at', { ascending: true })) as QueryListResult<Record<string, unknown>>
  }

  async listItemDeliverables(
    supabase: SupabaseClient,
    input: { spaceId: string; itemId: string },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await supabase
      .from('space_item_deliverables')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('item_id', input.itemId)
      .order('created_at', { ascending: false })) as QueryListResult<Record<string, unknown>>
  }

  async createTask(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('space_items').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async updateTask(
    supabase: SupabaseClient,
    input: { spaceId: string; taskId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .update(input.updates)
      .eq('space_id', input.spaceId)
      .eq('id', input.taskId)
      .select()
      .single()) as { data: Record<string, unknown>; error: QueryError | null }
  }

  async createActivity(
    supabase: SupabaseClient,
    input: ArtifactTaskActivityInput,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('space_item_activity').insert(input).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async createActivities(
    supabase: SupabaseClient,
    inputs: ArtifactTaskActivityInput[],
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('space_item_activity').insert(inputs)) as {
      error: QueryError | null
    }
  }
}
