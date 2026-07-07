import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type Snapshot = Record<string, unknown> | null

@Injectable()
export class ArtifactFunnelHistoryRepository {
  async readFileSnapshot(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ): Promise<{ data: Snapshot; error: QueryError | null }> {
    let query = supabase
      .from('funnel_files')
      .select('*')
      .eq('funnel_id', input.funnelId)
      .eq('path', input.path)
    query = input.funnelPageId
      ? query.eq('funnel_page_id', input.funnelPageId)
      : query.is('funnel_page_id', null)
    const { data, error } = (await query.maybeSingle()) as {
      data: Snapshot
      error: QueryError | null
    }
    return { data: data ?? null, error }
  }

  async supersedeRedo(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase
      .from('funnel_change_sets')
      .update({
        status: 'superseded',
        superseded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('funnel_id', input.funnelId)
      .eq('status', 'undone')
    query = input.funnelPageId
      ? query.or(`funnel_page_id.eq.${input.funnelPageId},funnel_page_id.is.null`)
      : query.is('funnel_page_id', null)
    return (await query) as { error: QueryError | null }
  }

  async createChangeSet(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('funnel_change_sets').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async insertChangeItems(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('funnel_change_items').insert(rows)) as {
      error: QueryError | null
    }
  }
}
