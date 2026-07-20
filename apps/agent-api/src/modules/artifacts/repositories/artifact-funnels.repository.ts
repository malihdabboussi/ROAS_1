import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }
type FunnelRow = Record<string, unknown> & {
  id: string
  user_id?: string | null
  org_id?: string | null
  name?: string | null
  funnel_type?: string | null
  campaign_id?: string | null
  space_id?: string | null
  metadata?: Record<string, unknown> | null
}

@Injectable()
export class ArtifactFunnelsRepository {
  async listFunnels(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; campaignId: string; typeFilter?: string },
  ): Promise<QueryListResult<FunnelRow>> {
    const baseQuery = input.orgId
      ? supabase
          .from('funnels')
          .select('*, funnel_pages!funnel_id(id, name, slug, page_type, order_index)')
          .eq('org_id', input.orgId)
      : supabase
          .from('funnels')
          .select('*, funnel_pages!funnel_id(id, name, slug, page_type, order_index)')
          .eq('user_id', input.userId)
          .is('org_id', null)
    let query = baseQuery.eq('campaign_id', input.campaignId)
    if (input.typeFilter) query = query.eq('funnel_type', input.typeFilter)
    return (await query.order('created_at', { ascending: false })) as QueryListResult<FunnelRow>
  }

  async findFunnel(
    supabase: SupabaseClient,
    input: { funnelId: string; userId: string; columns?: string },
  ): Promise<QueryResult<FunnelRow>> {
    return (await supabase
      .from('funnels')
      .select(input.columns ?? '*')
      .eq('id', input.funnelId)
      .eq('user_id', input.userId)
      .maybeSingle()) as QueryResult<FunnelRow>
  }

  async findSlug(
    supabase: SupabaseClient,
    input: { slug: string; userId: string },
  ): Promise<QueryResult<{ id: string }>> {
    return (await supabase
      .from('funnels')
      .select('id')
      .eq('slug', input.slug)
      .eq('user_id', input.userId)
      .maybeSingle()) as QueryResult<{ id: string }>
  }

  async findMissionSubtaskFunnel(
    supabase: SupabaseClient,
    input: { userId: string; missionId: string; missionSubtaskId: string },
  ): Promise<QueryResult<FunnelRow>> {
    return (await supabase
      .from('funnels')
      .select('*')
      .eq('user_id', input.userId)
      .contains('metadata', {
        mission_id: input.missionId,
        mission_subtask_id: input.missionSubtaskId,
        source_action: 'create_funnel',
      })
      .maybeSingle()) as QueryResult<FunnelRow>
  }

  async createFunnel(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: FunnelRow; error: QueryError | null }> {
    return (await supabase.from('funnels').insert(payload).select().single()) as {
      data: FunnelRow
      error: QueryError | null
    }
  }

  async updateFunnel(
    supabase: SupabaseClient,
    input: { funnelId: string; userId: string; updates: Record<string, unknown>; columns?: string },
  ): Promise<QueryResult<FunnelRow>> {
    return (await supabase
      .from('funnels')
      .update(input.updates)
      .eq('id', input.funnelId)
      .eq('user_id', input.userId)
      .select(input.columns ?? '*')
      .maybeSingle()) as QueryResult<FunnelRow>
  }

  async createFunnelPage(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('funnel_pages').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async updateFunnelPage(
    supabase: SupabaseClient,
    input: { funnelPageId: string; updates: Record<string, unknown> },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('funnel_pages')
      .update(input.updates)
      .eq('id', input.funnelPageId)
      .select()
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async touchFunnelPage(
    supabase: SupabaseClient,
    funnelPageId: string,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('funnel_pages')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', funnelPageId)) as { error: QueryError | null }
  }

  async findFunnelPageScope(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string },
  ): Promise<QueryResult<{ id: string; source_mode?: string | null }>> {
    return (await supabase
      .from('funnel_pages')
      .select('id, source_mode')
      .eq('id', input.funnelPageId)
      .eq('funnel_id', input.funnelId)
      .maybeSingle()) as QueryResult<{ id: string; source_mode?: string | null }>
  }

  async findFunnelPageFunnelId(
    supabase: SupabaseClient,
    funnelPageId: string,
  ): Promise<QueryResult<{ id: string; funnel_id: string }>> {
    return (await supabase
      .from('funnel_pages')
      .select('id, funnel_id')
      .eq('id', funnelPageId)
      .maybeSingle()) as QueryResult<{ id: string; funnel_id: string }>
  }

  async upsertEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('funnel_conversion_points')
      .upsert(payload, { onConflict: 'funnel_page_id,kind' })
      .select('id')
      .single()) as QueryResult<Record<string, unknown>>
  }

  async deleteEmailCaptureConversionPoint(
    supabase: SupabaseClient,
    input: { funnelPageId: string; kind: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('funnel_conversion_points')
      .delete()
      .eq('funnel_page_id', input.funnelPageId)
      .eq('kind', input.kind)) as { error: QueryError | null }
  }
}
