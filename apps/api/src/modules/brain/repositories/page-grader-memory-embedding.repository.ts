import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class PageGraderMemoryEmbeddingRepository {
  loadMissing(
    supabase: SupabaseClient,
    input: {
      brainId: string
      offset: number
      pageSize: number
    },
  ) {
    return supabase
      .from('ns_memories')
      .select('id, content')
      .eq('brain_id', input.brainId)
      .like('source_type', 'page_grader_%')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .range(input.offset, input.offset + input.pageSize - 1)
  }

  updateEmbedding(
    supabase: SupabaseClient,
    input: {
      memoryId: string
      embedding: string
    },
  ) {
    return supabase
      .from('ns_memories')
      .update({ embedding: input.embedding })
      .eq('id', input.memoryId)
  }
}
