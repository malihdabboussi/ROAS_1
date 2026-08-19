import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rankRelatedCalls, relatedCallCandidateFromItem } from '../domain/meeting-related-calls'
import { MeetingCallMatchingRepository } from '../repositories/meeting-call-matching.repository'

@Injectable()
export class MeetingRelatedCallsService {
  constructor(private readonly matching: MeetingCallMatchingRepository) {}

  async listRelatedCalls(
    supabase: SupabaseClient,
    input: { spaceId: string; meetingItemId: string },
  ): Promise<
    Array<{
      meeting_item_id: string
      title: string
      call_date: string | null
      call_status: string | null
      recording_url: string | null
      score: number
      item: Record<string, unknown>
    }>
  > {
    const current = await this.matching.findCallItemById(supabase, input.meetingItemId)
    if (!current) return []
    const candidates = await this.matching.listCallItemsForSpace(supabase, input.spaceId)
    const byId = new Map(candidates.map((row) => [String(row.id ?? ''), row]))
    return rankRelatedCalls(
      relatedCallCandidateFromItem(current),
      candidates.map(relatedCallCandidateFromItem),
    ).map((row) => ({
      meeting_item_id: row.id,
      title: row.title,
      call_date: row.callDate,
      call_status: row.callStatus,
      recording_url: row.recordingUrl,
      score: row.score,
      item: byId.get(row.id) ?? { id: row.id, title: row.title, custom_data: {} },
    }))
  }
}
