import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BrainHandoffTargetRepository {
  async resolveCampaignId(
    client: SupabaseClient,
    input: { campaignId: string; userId: string; orgId: string | null },
  ): Promise<string | null> {
    let query = client.from('campaigns').select('id').eq('id', input.campaignId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve campaign: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  async findDefaultBrainId(client: SupabaseClient, userId: string): Promise<string | null> {
    const { data, error } = await client
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve default brain: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  async createDefaultBrain(client: SupabaseClient, userId: string): Promise<string> {
    const { data, error } = await client
      .from('ns_brains')
      .insert({
        owner_id: userId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Failed to create default brain: ${error.message}`)
    if (!data?.id) throw new Error('Failed to create default brain: no id returned')
    return String(data.id)
  }

  async findAgentBrainId(
    client: SupabaseClient,
    input: { userId: string; agentKey: string; orgId: string | null },
  ): Promise<string | null> {
    let query = client.from('ns_brains').select('id').eq('agent_id', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('owner_id', input.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve agent brain: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  async createAgentBrain(
    client: SupabaseClient,
    input: { userId: string; agentKey: string; orgId: string | null },
  ): Promise<string> {
    const { data, error } = await client
      .from('ns_brains')
      .insert({
        owner_id: input.userId,
        org_id: input.orgId ?? null,
        name: `${input.agentKey} Brain`,
        agent_id: input.agentKey,
        is_default: false,
      })
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Failed to create agent brain: ${error.message}`)
    if (!data?.id) throw new Error('Failed to create agent brain: no id returned')
    return String(data.id)
  }
}
