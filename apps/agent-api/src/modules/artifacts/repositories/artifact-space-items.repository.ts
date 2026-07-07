import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactSpaceItemsRepository {
  async createSpaceDocItem(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('space_items').insert(payload).select('id').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
