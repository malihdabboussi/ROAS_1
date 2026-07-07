import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { VaultSecret } from '../services/vault.service'

@Injectable()
export class VaultRepository {
  constructor(private readonly config: ConfigService) {}

  async upsertSecret(input: {
    userId: string
    provider: string
    label: string
    secretType: string
    encryptedValue: string
    metadata: Record<string, unknown>
    updatedAt: string
  }): Promise<void> {
    const admin = this.getAdminClient()
    const { error } = await admin.from('vault_secrets').upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        label: input.label,
        secret_type: input.secretType,
        encrypted_value: input.encryptedValue,
        metadata: input.metadata,
        updated_at: input.updatedAt,
      },
      { onConflict: 'user_id,provider,label' },
    )

    if (error) throw new BadRequestException(`Failed to store secret: ${error.message}`)
  }

  async findEncryptedSecret(
    userId: string,
    provider: string,
    label: string,
  ): Promise<string | null> {
    const admin = this.getAdminClient()
    const { data, error } = await admin
      .from('vault_secrets')
      .select('encrypted_value')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('label', label)
      .maybeSingle()

    if (error || !data) return null
    return (data as { encrypted_value: string }).encrypted_value
  }

  async listSecretsByProvider(userId: string, provider: string): Promise<VaultSecret[]> {
    const admin = this.getAdminClient()
    const { data, error } = await admin
      .from('vault_secrets')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)

    if (error || !data) return []
    return data as VaultSecret[]
  }

  async listSecrets(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<
    Array<{
      id: string
      provider: string
      label: string
      secret_type: string
      metadata: Record<string, unknown>
      created_at: string
    }>
  > {
    const { data, error } = await supabase
      .from('vault_secrets')
      .select('id, provider, label, secret_type, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return []
    return data ?? []
  }

  async deleteSecret(userId: string, provider: string, label: string): Promise<void> {
    const admin = this.getAdminClient()
    const { error } = await admin
      .from('vault_secrets')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('label', label)

    if (error) throw new BadRequestException(`Failed to delete secret: ${error.message}`)
  }

  async hasSecret(userId: string, provider: string, label: string): Promise<boolean> {
    const admin = this.getAdminClient()
    const { data } = await admin
      .from('vault_secrets')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('label', label)
      .maybeSingle()

    return !!data
  }

  private getAdminClient() {
    const url = this.config.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || ''
    const serviceKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ''
    if (!url || !serviceKey) {
      throw new BadRequestException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey)
  }
}
