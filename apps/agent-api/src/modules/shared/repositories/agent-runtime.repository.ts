import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class AgentRuntimeRepository {
  async findAgentLevel(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      agentKey: string
    },
  ): Promise<unknown> {
    let runtimeQ = supabase
      .from('agents_registry')
      .select('level')
      .eq('agent_key', input.agentKey)
    if (input.orgId) {
      runtimeQ = runtimeQ.eq('org_id', input.orgId).is('user_id', null)
    } else {
      runtimeQ = runtimeQ.eq('user_id', input.userId).is('org_id', null)
    }
    const { data } = await runtimeQ.maybeSingle()
    return data?.level
  }
}
