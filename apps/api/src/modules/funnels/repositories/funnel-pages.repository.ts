import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Funnel Pages Repository (Layer 3)
 *
 * Data access for the funnel_pages table.
 * NO business logic — only queries.
 */
@Injectable()
export class FunnelPagesRepository {
  async findByFunnelId(supabase: SupabaseClient, funnelId: string) {
    const { data, error } = await supabase
      .from('funnel_pages')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  /**
   * Load a funnel page by id. Do not filter by funnel_pages.org_id — many rows have org_id NULL;
   * org-scoped access is enforced by RLS (org_funnel_pages_all). Nested funnel list queries use
   * funnel_id only, so filtering org_id here caused GET /funnels/:id/pages/:pageId to 404 while
   * the same pages appeared in GET /funnels?campaign_id=.
   */
  async findById(supabase: SupabaseClient, pageId: string, _orgId?: string | null) {
    const { data, error } = await supabase
      .from('funnel_pages')
      .select('*')
      .eq('id', pageId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB error: ${error.message}`)
    }
    return data
  }

  async create(
    supabase: SupabaseClient,
    record: {
      funnel_id: string
      name: string
      page_type?: string
      generated_html: string
      generated_css: string
      order_index: number
      slug?: string
      path?: string
      generation_mode?: string
      content?: Record<string, unknown>
      seo?: Record<string, unknown>
      sections?: Record<string, unknown>[]
      theme_config?: Record<string, unknown>
    },
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('funnel_pages')
      .insert({ ...record, org_id: orgId ?? null })
      .select()
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(supabase: SupabaseClient, pageId: string, fields: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('funnel_pages')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', pageId)
      .select()
      .single()

    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(supabase: SupabaseClient, pageId: string): Promise<void> {
    const { error } = await supabase.from('funnel_pages').delete().eq('id', pageId)
    if (error) throw new Error(`Failed to delete page: ${error.message}`)
  }
}
