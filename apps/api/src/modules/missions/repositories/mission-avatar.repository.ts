import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionAgentGatewayService } from '../services/gateways/mission-agent-gateway.service'

export type AgentAvatarBackfillRow = {
  user_id: string
  agent_key: string
  name: string
  role: string
  org_id?: string | null
}

@Injectable()
export class MissionAvatarRepository {
  constructor(private readonly missionAgentGatewayService: MissionAgentGatewayService) {}

  async patchAgentRegistry(
    agentKey: string,
    userId: string,
    orgId: string | null | undefined,
    patch: Record<string, unknown>,
  ) {
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    let query = supabase.from('agents_registry').update(patch).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    return query
  }

  async listNonVibeyMissingAvatarAgents(supabase: SupabaseClient) {
    const { data } = await supabase
      .from('agents_registry')
      .select('user_id, agent_key, name, role, org_id')
      .is('image_url', null)
      .in('level', ['c_level', 'system', 'employee', 'manager'])
      .neq('agent_key', 'vibey')

    return ((data as AgentAvatarBackfillRow[] | null) ?? [])
  }

  async listVibeyPortraitMissingAvatarAgents(supabase: SupabaseClient) {
    const { data } = await supabase
      .from('agents_registry')
      .select('user_id, agent_key, name, role, org_id')
      .is('image_url', null)
      .eq('agent_key', 'vibey')
      .eq('level', 'c_level')
      .eq('config->>avatar_mode', 'portrait')

    return ((data as AgentAvatarBackfillRow[] | null) ?? [])
  }
}
