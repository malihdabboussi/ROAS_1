import { BadRequestException, Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  OPENAI_CODEX_INTEGRATION_ID,
  OPENAI_CODEX_PROVIDER,
  OPENAI_CODEX_VAULT_LABEL,
  type OpenAICodexStatus,
  type OpenAICodexTokenBundle,
} from '../types/openai-codex.types'

@Injectable()
export class OpenAICodexRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async upsertConnection(userId: string, bundle: OpenAICodexTokenBundle): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    const expiresAt = new Date(bundle.expires).toISOString()
    const metadata = {
      account_id: bundle.accountId,
      email: bundle.email ?? null,
      vault_secret_label: OPENAI_CODEX_VAULT_LABEL,
      admin_only: true,
      token_storage: 'vault_secrets',
    }
    const row = {
      user_id: userId,
      integration_id: OPENAI_CODEX_INTEGRATION_ID,
      provider: OPENAI_CODEX_PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: expiresAt,
      connected_at: now,
      error_message: null,
      metadata,
      connection_label: bundle.email ?? bundle.accountId,
      scope_mode: 'personal',
      is_default: false,
      updated_at: now,
    }

    const { data: existing, error: readError } = await admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', OPENAI_CODEX_INTEGRATION_ID)
      .is('org_id', null)
      .maybeSingle()

    if (readError) {
      throw new BadRequestException(`Failed to read OpenAI Codex connection: ${readError.message}`)
    }

    if (existing) {
      const { error } = await admin
        .from('user_integrations')
        .update(row)
        .eq('user_id', userId)
        .eq('integration_id', OPENAI_CODEX_INTEGRATION_ID)
        .is('org_id', null)
      if (error)
        throw new BadRequestException(`Failed to update OpenAI Codex connection: ${error.message}`)
      return
    }

    const { error } = await admin.from('user_integrations').insert({ ...row, org_id: null })
    if (error)
      throw new BadRequestException(`Failed to create OpenAI Codex connection: ${error.message}`)
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
      .eq('integration_id', OPENAI_CODEX_INTEGRATION_ID)
      .is('org_id', null)

    if (error) {
      throw new BadRequestException(`Failed to disconnect OpenAI Codex: ${error.message}`)
    }
  }

  async getStatus(userId: string): Promise<OpenAICodexStatus | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select('status, connected_at, token_expires_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', OPENAI_CODEX_INTEGRATION_ID)
      .is('org_id', null)
      .maybeSingle()

    if (error) {
      throw new BadRequestException(`Failed to read OpenAI Codex status: ${error.message}`)
    }
    if (!data) return null

    const metadata = (data.metadata as Record<string, unknown> | null) ?? {}
    return {
      connected: data.status === 'connected',
      status: (data.status as string) ?? null,
      accountId: (metadata.account_id as string) ?? null,
      email: (metadata.email as string) ?? null,
      connectedAt: (data.connected_at as string) ?? null,
      tokenExpiresAt: (data.token_expires_at as string) ?? null,
    }
  }
}
