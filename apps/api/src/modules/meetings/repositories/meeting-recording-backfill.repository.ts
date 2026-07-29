import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class MeetingRecordingBackfillRepository {
  async listMissingTranscripts(
    supabase: SupabaseClient,
    input: { userId: string; limit: number; beforeCreatedAt?: string },
  ): Promise<Record<string, unknown>[]> {
    let query = supabase
      .from('meeting_recordings')
      .select('*')
      .eq('user_id', input.userId)
      .eq('provider', 'fathom')
      .is('transcript_doc_item_id', null)
      .order('created_at', { ascending: false })
      .limit(input.limit)
    if (input.beforeCreatedAt) {
      query = query.lt('created_at', input.beforeCreatedAt)
    }
    const { data, error } = await query
    if (error) throw new BadRequestException(error.message)
    return (data as Record<string, unknown>[]) ?? []
  }
}
