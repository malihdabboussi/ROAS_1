import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FeedbackRepository } from '../repositories/feedback.repository'

@Injectable()
export class FeedbackService {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  async submitFeedback(
    supabase: SupabaseClient,
    profileId: string,
    input: {
      snapshotId: string
      query: string
      rating: 1 | -1
      searchMode?: string
      position?: number
      comment?: string
    },
  ) {
    const { data, error } = await this.feedbackRepository.insertFeedback(supabase, {
      profile_id: profileId,
      query: input.query,
      snapshot_id: input.snapshotId,
      rating: input.rating,
      search_mode: input.searchMode ?? null,
      position: input.position ?? null,
      comment: input.comment ?? null,
    })
    if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
    return { id: data.id }
  }

  async getBoostMap(
    supabase: SupabaseClient,
    profileId: string,
    snapshotIds: string[],
  ): Promise<Record<string, number>> {
    if (!snapshotIds.length) return {}
    const { data, error } = await this.feedbackRepository.findRatings(
      supabase,
      profileId,
      snapshotIds,
    )
    if (error) throw new Error(`Failed to load feedback boosts: ${error.message}`)

    const boosts: Record<string, number> = {}
    for (const row of data ?? []) {
      const current = boosts[row.snapshot_id] ?? 0
      boosts[row.snapshot_id] = current + Number(row.rating ?? 0)
    }
    return boosts
  }
}
