import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ScholarContextRepository {
  async searchRelatedMemories(client: SupabaseClient, userId: string, vector: number[]) {
    const { data } = await client.rpc('search_ns_memories', {
      p_embedding: JSON.stringify(vector),
      p_owner_id: userId,
      p_match_threshold: 0.6,
      p_match_count: 5,
      p_min_significance: 0,
    })
    return data ?? []
  }

  async loadBrainStats(client: SupabaseClient, userId: string) {
    const [memResult, skResult] = await Promise.all([
      client.from('ns_memories').select('id', { count: 'exact', head: true }).eq('speaker', userId),
      client.from('ns_sk_entries').select('domain', { count: 'exact' }).limit(500),
    ])
    return {
      totalMemories: memResult.count ?? 0,
      totalSkEntries: skResult.count ?? 0,
      domains: ((skResult.data ?? []) as Array<{ domain: string | null }>).map(
        (row) => row.domain ?? 'general',
      ),
    }
  }
}
