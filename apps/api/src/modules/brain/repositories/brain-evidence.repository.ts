import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class BrainEvidenceRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }

  async upsertEvidenceChunk(client: SupabaseClient, record: Record<string, unknown>) {
    return client
      .from('ns_brain_evidence_chunks')
      .upsert(record, { onConflict: 'brain_id,source_type,source_id,chunk_index' })
  }

  async upsertEpisode(client: SupabaseClient, record: Record<string, unknown>) {
    return client
      .from('brain_episodes')
      .upsert(record, { onConflict: 'brain_id,source_type,source_id' })
      .select('id')
      .single()
  }
}
