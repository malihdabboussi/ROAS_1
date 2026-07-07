import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  table(supabase: SupabaseClient, tableName: string): any {
    return supabase.from(tableName)
  }

  async findAdminPersonalOpenAICodexIntegration(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.findAdminPersonalIntegration(userId, 'openai_codex')
  }

  async findAdminPersonalAnthropicClaudeIntegration(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.findAdminPersonalIntegration(userId, 'anthropic_claude')
  }

  private async findAdminPersonalIntegration(
    userId: string,
    integrationId: string,
  ): Promise<Record<string, unknown> | null> {
    const serviceClient = this.getServiceClient()
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    const role = String((profile as { role?: unknown } | null)?.role ?? '')

    if (role !== 'admin' && role !== 'superadmin') return null

    const { data } = await serviceClient
      .from('user_integrations')
      .select(
        'id, user_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, connected_at, updated_at',
      )
      .eq('integration_id', integrationId)
      .eq('user_id', userId)
      .is('org_id', null)
      .maybeSingle()

    return (data as Record<string, unknown> | null) ?? null
  }

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }
}
