import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactLegacyRepository {
  async insertBillingHealthLog(
    serviceClient: SupabaseClient,
    params: {
      feature: string
      action: string
      userId?: string
      modelName: string
      reason: string
      errorMessage?: string
      usageJson?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    await serviceClient.from('billing_health_log').insert({
      feature: params.feature,
      action: params.action,
      user_id: params.userId,
      model_name: params.modelName,
      reason: params.reason,
      error_message: params.errorMessage,
      usage_json: params.usageJson,
      metadata: params.metadata,
    })
  }

  async findAgentDefinitionsForCheckpoint(
    serviceClient: SupabaseClient,
    input: { userId: string; orgId: string | null; agentKey: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = serviceClient
      .from('agent_definitions')
      .select('file_name, content')
      .eq('agent_key', input.agentKey)
      .order('file_name', { ascending: true })
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findAgentSkillsForCheckpoint(
    serviceClient: SupabaseClient,
    input: { userId: string; orgId: string | null; agentKey: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = serviceClient
      .from('agent_skills')
      .select('skill_key, name, description, markdown_content, is_enabled')
      .eq('agent_key', input.agentKey)
      .order('skill_key', { ascending: true })
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}
