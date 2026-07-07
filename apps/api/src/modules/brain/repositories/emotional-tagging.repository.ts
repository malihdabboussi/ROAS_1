import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EmotionalTaggingRepository {
  async updateMemoryEmotion(
    client: SupabaseClient,
    memoryId: string,
    update: Record<string, unknown>,
  ) {
    const { error } = await client.from('ns_memories').update(update).eq('id', memoryId)
    return error
  }
}
