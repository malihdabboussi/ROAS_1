import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Funnel Files Repository (Layer 3)
 *
 * Data access for funnel_files (HTML bundle source, page-scoped or
 * funnel-shared) and funnel_assets (media mappings). funnel_files uses
 * partial unique indexes per scope, so writes are select-then-write
 * instead of upsert onConflict.
 */
@Injectable()
export class FunnelFilesRepository {
  async findScoped(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ) {
    let q = supabase
      .from('funnel_files')
      .select('*')
      .eq('funnel_id', input.funnelId)
      .eq('path', input.path)
    q = input.funnelPageId
      ? q.eq('funnel_page_id', input.funnelPageId)
      : q.is('funnel_page_id', null)
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(`Failed to read funnel file: ${error.message}`)
    return data
  }

  async listForPage(supabase: SupabaseClient, funnelId: string, funnelPageId: string) {
    const { data, error } = await supabase
      .from('funnel_files')
      .select('*')
      .eq('funnel_id', funnelId)
      .or(`funnel_page_id.eq.${funnelPageId},funnel_page_id.is.null`)
      .order('path', { ascending: true })
    if (error) throw new Error(`Failed to list funnel files: ${error.message}`)
    return data ?? []
  }

  async upsertScoped(
    supabase: SupabaseClient,
    row: {
      funnel_id: string
      funnel_page_id: string | null
      user_id: string
      org_id: string | null
      path: string
      content: string
      mime_type: string
      role: string
      size_bytes: number
    },
  ) {
    let existingQuery = supabase
      .from('funnel_files')
      .select('id')
      .eq('funnel_id', row.funnel_id)
      .eq('path', row.path)
    existingQuery = row.funnel_page_id
      ? existingQuery.eq('funnel_page_id', row.funnel_page_id)
      : existingQuery.is('funnel_page_id', null)
    const { data: existing, error: existingError } = await existingQuery.maybeSingle()
    if (existingError) throw new Error(`Failed to read funnel file: ${existingError.message}`)

    const payload = { ...row, updated_at: new Date().toISOString() }
    if (existing) {
      const { data, error } = await supabase
        .from('funnel_files')
        .update(payload)
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
      if (error) throw new Error(`Failed to update funnel file: ${error.message}`)
      return data
    }
    const { data, error } = await supabase.from('funnel_files').insert(payload).select().single()
    if (error) throw new Error(`Failed to write funnel file: ${error.message}`)
    return data
  }

  async listAssets(supabase: SupabaseClient, funnelId: string) {
    const { data, error } = await supabase
      .from('funnel_assets')
      .select('*, media_assets(id, file_path, bucket_name, public_url, mime_type, file_size)')
      .eq('funnel_id', funnelId)
      .order('path', { ascending: true })
    if (error) throw new Error(`Failed to list funnel assets: ${error.message}`)
    return data ?? []
  }
}
