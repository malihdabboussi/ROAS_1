import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class FeedbackRepository {
  async insertFeedback(
    client: SupabaseClient,
    record: {
      profile_id: string
      query: string
      snapshot_id: string
      rating: 1 | -1
      search_mode: string | null
      position: number | null
      comment: string | null
    },
  ) {
    return client.from('ns_search_feedback').insert(record).select('id').single()
  }

  async findRatings(client: SupabaseClient, profileId: string, snapshotIds: string[]) {
    return client
      .from('ns_search_feedback')
      .select('snapshot_id, rating')
      .eq('profile_id', profileId)
      .in('snapshot_id', snapshotIds)
  }
}
