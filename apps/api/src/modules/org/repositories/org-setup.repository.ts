import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type CoreOrgAgentInput = {
  orgId: string
  userId: string
  agent: {
    agent_key: string
    name: string
    role: string
    level: string
    config: Record<string, unknown>
  }
}

@Injectable()
export class OrgSetupRepository {
  async findCoreOrgAgent(supabase: SupabaseClient, orgId: string, agentKey: string) {
    const { data } = await supabase
      .from('agents_registry')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('org_id', orgId)
      .is('user_id', null)
      .maybeSingle()
    return data
  }

  async insertCoreOrgAgent(supabase: SupabaseClient, input: CoreOrgAgentInput) {
    const { error } = await supabase.from('agents_registry').insert({
      user_id: null,
      org_id: input.orgId,
      agent_key: input.agent.agent_key,
      name: input.agent.name,
      role: input.agent.role,
      skills: [],
      status: 'idle',
      level: input.agent.level,
      created_by: input.userId,
      config: input.agent.config,
    })
    return error
  }

  async listCompletedStarterCreditPurchases(supabase: SupabaseClient, orgId: string) {
    const { data } = await supabase
      .from('org_credit_purchases')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .limit(1)
    return data ?? []
  }

  async insertStarterCredits(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
    credits: number,
  ) {
    const { error } = await supabase.from('org_credit_purchases').insert({
      org_id: orgId,
      credits_purchased: credits,
      amount_paid: 0,
      status: 'completed',
      purchased_by: userId,
    })
    if (error) throw new Error(error.message)
  }
}
