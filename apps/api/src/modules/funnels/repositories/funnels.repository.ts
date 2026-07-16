import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Funnels Repository (Layer 3)
 *
 * Data access for the funnels table.
 * NO business logic — only queries.
 */
/**
 * Page columns safe for list (summary) responses — excludes the heavy
 * generated_html / generated_css / sections / theme_config payloads that
 * only the single-funnel GET needs.
 *
 * Intentionally omits `path` and `source_mode`: those columns land via later
 * migrations, and selecting them on DBs that have not applied them returns 500
 * for the entire All Artifacts / funnels list.
 */
const FUNNEL_PAGE_SUMMARY_COLUMNS =
  'id, funnel_id, name, page_type, order_index, is_published, created_at, updated_at'

@Injectable()
export class FunnelsRepository {
  async findByCampaignId(
    supabase: SupabaseClient,
    campaignId: string,
    orgId?: string | null,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    const pagesSelect = options?.summary ? FUNNEL_PAGE_SUMMARY_COLUMNS : '*'
    let q = supabase
      .from('funnels')
      .select(`*, pages:funnel_pages!funnel_id(${pagesSelect})`)
      .eq('campaign_id', campaignId)
      .neq('status', 'archived')
    if (orgId !== undefined) {
      q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    }
    if (spaceId) q = q.eq('space_id', spaceId)
    const { data, error } = await q.order('updated_at', { ascending: false })

    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findById(supabase: SupabaseClient, id: string, orgId?: string | null) {
    let q = supabase.from('funnels').select('*').eq('id', id)
    if (orgId !== undefined) {
      q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    }
    const { data, error } = await q.single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }
    return data
  }

  async findByIdWithPages(supabase: SupabaseClient, id: string, orgId?: string | null) {
    let q = supabase.from('funnels').select('*, pages:funnel_pages!funnel_id(*)').eq('id', id)
    if (orgId !== undefined) {
      q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    }
    const { data, error } = await q.single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }
    return data
  }

  async create(
    supabase: SupabaseClient,
    record: {
      user_id: string
      name: string
      funnel_type: string
      campaign_id: string
      space_id?: string | null
    },
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('funnels')
      .insert({ ...record, org_id: orgId ?? null })
      .select()
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(supabase: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('funnels')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('funnels').delete().eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }
}
