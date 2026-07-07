import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message?: string }
type SingleResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }
type MutateResult = { data: unknown | null; error: QueryError | null }

type SingleQuery = {
  eq(field: string, value: unknown): SingleQuery
  is(field: string, value: null): SingleQuery
  maybeSingle<T = Record<string, unknown>>(): Promise<SingleResult<T>>
}

type UpdateQuery = {
  eq(field: string, value: unknown): UpdateQuery
  is(field: string, value: null): Promise<MutateResult>
}

type TableQuery = {
  select(columns: string): SingleQuery
  update(payload: Record<string, unknown>): UpdateQuery
  upsert(payload: Record<string, unknown>, options?: Record<string, unknown>): Promise<MutateResult>
}

export interface ChatAdminConnectionRow {
  status?: string | null
  token_expires_at?: string | null
  metadata?: Record<string, unknown> | null
}

@Injectable()
export class ChatAdminAuthRepository {
  async findUserRole(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ role: string | null; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle<{ role?: string }>()
    return { role: typeof data?.role === 'string' ? data.role : null, error }
  }

  async findAnthropicConnection(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
  ): Promise<{ connection: ChatAdminConnectionRow | null; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'user_integrations')
      .select('status, metadata')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .is('org_id', null)
      .maybeSingle<ChatAdminConnectionRow>()
    return { connection: data, error }
  }

  async findOpenAICodexConnection(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
  ): Promise<{ connection: ChatAdminConnectionRow | null; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'user_integrations')
      .select('status, token_expires_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .is('org_id', null)
      .maybeSingle<ChatAdminConnectionRow>()
    return { connection: data, error }
  }

  async findVaultEncryptedValue(
    supabase: SupabaseClient,
    input: { userId: string; provider: string; label: string },
  ): Promise<{ encryptedValue: string | null; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'vault_secrets')
      .select('encrypted_value')
      .eq('user_id', input.userId)
      .eq('provider', input.provider)
      .eq('label', input.label)
      .maybeSingle<{ encrypted_value?: string }>()
    return {
      encryptedValue: typeof data?.encrypted_value === 'string' ? data.encrypted_value : null,
      error,
    }
  }

  async upsertOpenAICodexVaultSecret(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'vault_secrets').upsert(payload, {
      onConflict: 'user_id,provider,label',
    })
    return error
  }

  async updateOpenAICodexIntegration(
    supabase: SupabaseClient,
    input: { userId: string; integrationId: string; payload: Record<string, unknown> },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'user_integrations')
      .update(input.payload)
      .eq('user_id', input.userId)
      .eq('integration_id', input.integrationId)
      .is('org_id', null)
    return error
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
