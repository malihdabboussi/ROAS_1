import { BadRequestException, Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  ANTHROPIC_CLAUDE_INTEGRATION_ID,
  ANTHROPIC_CLAUDE_PROVIDER,
  ANTHROPIC_CLAUDE_VAULT_LABEL,
  type AnthropicClaudeStatus,
} from '../types/anthropic-claude.types'

@Injectable()
export class AnthropicClaudeRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async upsertConnection(userId: string): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    const metadata = {
      admin_only: true,
      token_storage: 'vault_secrets',
      vault_secret_label: ANTHROPIC_CLAUDE_VAULT_LABEL,
      runtime_provider: ANTHROPIC_CLAUDE_PROVIDER,
      provider_model_prefix: 'anthropic-subscription',
      token_type: 'setup_token',
    }
    const row = {
      user_id: userId,
      integration_id: ANTHROPIC_CLAUDE_INTEGRATION_ID,
      provider: ANTHROPIC_CLAUDE_PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata,
      connection_label: 'Claude subscription',
      scope_mode: 'personal',
      is_default: false,
      updated_at: now,
    }

    const { data: existing, error: readError } = await admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', ANTHROPIC_CLAUDE_INTEGRATION_ID)
      .is('org_id', null)
      .maybeSingle()

    if (readError) {
      throw new BadRequestException(`Failed to read Claude connection: ${readError.message}`)
    }

    if (existing) {
      const { error } = await admin
        .from('user_integrations')
        .update(row)
        .eq('user_id', userId)
        .eq('integration_id', ANTHROPIC_CLAUDE_INTEGRATION_ID)
        .is('org_id', null)
      if (error) throw new BadRequestException(`Failed to update Claude connection: ${error.message}`)
      return
    }

    const { error } = await admin.from('user_integrations').insert({ ...row, org_id: null })
    if (error) throw new BadRequestException(`Failed to create Claude connection: ${error.message}`)
  }

  async markDisconnected(userId: string): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        error_message: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', ANTHROPIC_CLAUDE_INTEGRATION_ID)
      .is('org_id', null)

    if (error) {
      throw new BadRequestException(`Failed to disconnect Claude: ${error.message}`)
    }
  }

  async getStatus(userId: string): Promise<AnthropicClaudeStatus | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select('status, connected_at')
      .eq('user_id', userId)
      .eq('integration_id', ANTHROPIC_CLAUDE_INTEGRATION_ID)
      .is('org_id', null)
      .maybeSingle()

    if (error) {
      throw new BadRequestException(`Failed to read Claude status: ${error.message}`)
    }
    if (!data) return null

    return {
      connected: data.status === 'connected',
      status: (data.status as string) ?? null,
      connectedAt: (data.connected_at as string) ?? null,
    }
  }
}
