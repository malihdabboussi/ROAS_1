import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MeetingRecordingBackfillCursor = {
  createdAt: string
  id: string
}

@Injectable()
export class MeetingRecordingBackfillRepository {
  async listMissingTranscripts(
    supabase: SupabaseClient,
    input: { userId: string; limit: number; cursor?: MeetingRecordingBackfillCursor },
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('meeting_recordings')
      .select('*')
      .eq('user_id', input.userId)
      .eq('provider', 'fathom')
      .is('transcript_doc_item_id', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(input.limit)
    if (input.cursor) {
      query = query.or(
        `created_at.lt.${input.cursor.createdAt},and(created_at.eq.${input.cursor.createdAt},id.lt.${input.cursor.id})`,
      )
    }
    const { data, error } = await query
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }
}
