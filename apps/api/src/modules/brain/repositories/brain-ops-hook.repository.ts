import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class BrainOpsHookRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async findBrainForManualCortex(brainId: string) {
    const { data } = await this.svc.client
      .from('ns_brains')
      .select(
        'owner_id, org_id, agent_id, campaign_id, is_default, name, scope, last_library_sync_at',
      )
      .eq('id', brainId)
      .single()
    return data ?? null
  }

  async enableCortexMax(brainId: string) {
    await this.svc.client
      .from('ns_brains')
      .update({ cortex_max: true, memories_since_last_sync: 0 })
      .eq('id', brainId)
  }

  async insertOutbox(record: Record<string, unknown>) {
    return this.svc.client.from('brain_ops_outbox').insert(record)
  }

  async incrementCounter(brainId: string, field: string, amount: number) {
    return this.svc.client.rpc('increment_brain_counter', {
      p_brain_id: brainId,
      p_field: field,
      p_amount: amount,
    })
  }

  async findBrainForLibrarySync(brainId: string) {
    const { data } = await this.svc.client
      .from('ns_brains')
      .select('owner_id, org_id, agent_id, campaign_id, is_default, last_library_sync_at, cortex_max')
      .eq('id', brainId)
      .single()
    return data ?? null
  }

  async resetMemoriesSinceLastSync(brainId: string) {
    await this.svc.client
      .from('ns_brains')
      .update({ memories_since_last_sync: 0 })
      .eq('id', brainId)
  }

  async findBrainForPagesUpdated(brainId: string) {
    const { data } = await this.svc.client
      .from('ns_brains')
      .select('owner_id, org_id, cortex_max')
      .eq('id', brainId)
      .single()
    return data ?? null
  }

  async resetPagesUpdatedSinceLastAnalysis(brainId: string) {
    await this.svc.client
      .from('ns_brains')
      .update({ pages_updated_since_last_analysis: 0 })
      .eq('id', brainId)
  }

  async findBrainForCustomerAvatar(brainId: string) {
    const { data } = await this.svc.client
      .from('ns_brains')
      .select('owner_id, org_id, scope, cortex_max')
      .eq('id', brainId)
      .single()
    return data ?? null
  }

  async resetCustomerMemoriesSinceLastAvatarPass(brainId: string) {
    await this.svc.client
      .from('ns_brains')
      .update({ customer_memories_since_last_avatar_pass: 0 })
      .eq('id', brainId)
  }

  async fetchNewMemories(brainId: string, since: string, limit: number) {
    const { data } = await this.svc.client
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_emotion, emotional_valence, emotional_intensity, speaker_intent, significance, tags, source_type, source_title, created_at',
      )
      .eq('brain_id', brainId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit)
    return data ?? []
  }

  async fetchNewSkEntries(brainId: string, since: string, limit: number) {
    const { data } = await this.svc.client
      .from('ns_sk_entries')
      .select('id, title, content, entry_type, domain, mastery, tags, source_id, created_at')
      .eq('brain_id', brainId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit)
    return data ?? []
  }

  async fetchNewCampaignNodes(campaignId: string, since: string, limit: number) {
    const { data } = await this.svc.client
      .from('campaign_nodes')
      .select('id, title, content, node_type, domain, source_type, media_type, created_at')
      .eq('campaign_id', campaignId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(limit)
    return data ?? []
  }
}
