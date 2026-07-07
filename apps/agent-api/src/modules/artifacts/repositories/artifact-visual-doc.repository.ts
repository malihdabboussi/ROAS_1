import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactVisualDocRepository {
  async findSpaceDoc(
    supabase: SupabaseClient,
    input: { itemId: string; requestedSpaceId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('space_items')
      .select('id, space_id, title, doc_body, custom_data')
      .eq('id', input.itemId)
    if (input.requestedSpaceId) query = query.eq('space_id', input.requestedSpaceId)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateVisualDocReady(
    supabase: SupabaseClient,
    input: { itemId: string; spaceId: string; customData: Record<string, unknown>; now: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .update({ custom_data: input.customData, updated_at: input.now })
      .eq('id', input.itemId)
      .eq('space_id', input.spaceId)
      .select('id, space_id, title, doc_body, custom_data')
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async updateVisualDocError(
    supabase: SupabaseClient,
    input: { itemId: string; spaceId: string; customData: Record<string, unknown>; message: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .update({
        custom_data: {
          ...input.customData,
          _doc_visual_status: 'error',
          _doc_visual_last_error: input.message,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId)
      .eq('space_id', input.spaceId)) as { error: QueryError | null }
  }
}
