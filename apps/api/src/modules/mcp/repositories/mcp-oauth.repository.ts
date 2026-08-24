import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthorizationRequestRow, OAuthClientRow } from '../services/mcp-oauth.types'

@Injectable()
export class McpOAuthRepository {
  async insertClient(supabase: SupabaseClient, row: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('mcp_oauth_clients').insert(row)
    if (error) throw new BadRequestException(error.message)
  }

  async createAuthorizationRequest(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('mcp_oauth_authorization_requests').insert(row)
    if (error) throw new BadRequestException(error.message)
  }

  async upsertConsent(supabase: SupabaseClient, row: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('mcp_oauth_consents')
      .upsert(row, { onConflict: 'client_id,user_id,org_id' })
      .select('id')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as { id: string }
  }

  async createAuthorizationCode(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('mcp_oauth_authorization_codes').insert(row)
    if (error) throw new BadRequestException(error.message)
  }

  async findAuthorizationCodeByHash(supabase: SupabaseClient, codeHash: string) {
    const { data, error } = await supabase
      .from('mcp_oauth_authorization_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, any> | null
  }

  async consumeAuthorizationCode(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('mcp_oauth_authorization_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', id)
      .is('consumed_at', null)
      .select('*')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, any> | null
  }

  async findTokenByAccessHash(supabase: SupabaseClient, tokenHash: string) {
    const { data, error } = await supabase
      .from('mcp_oauth_tokens')
      .select('*, mcp_oauth_consents!inner(status), mcp_oauth_clients!inner(client_name, logo_uri)')
      .eq('access_token_hash', tokenHash)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, any> | null
  }

  async touchTokenLastUsed(supabase: SupabaseClient, tokenId: string): Promise<void> {
    await supabase
      .from('mcp_oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenId)
  }

  async revokeTokenByHash(supabase: SupabaseClient, tokenHash: string): Promise<void> {
    await supabase
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .or(`access_token_hash.eq.${tokenHash},refresh_token_hash.eq.${tokenHash}`)
  }

  async cleanupExpiredRows(
    supabase: SupabaseClient,
    now: string,
    auditCutoff: string,
  ): Promise<void> {
    await supabase.from('mcp_oauth_authorization_requests').delete().lt('expires_at', now)
    await supabase.from('mcp_oauth_authorization_codes').delete().lt('expires_at', now)
    await supabase
      .from('mcp_oauth_tokens')
      .delete()
      .lt('refresh_expires_at', auditCutoff)
      .not('revoked_at', 'is', null)
  }

  async findClient(supabase: SupabaseClient, clientId: string): Promise<OAuthClientRow | null> {
    const { data, error } = await supabase
      .from('mcp_oauth_clients')
      .select('client_id, client_name, client_uri, logo_uri, redirect_uris, is_enabled, metadata')
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as OAuthClientRow | null) ?? null
  }

  async findAuthorizationRequest(
    supabase: SupabaseClient,
    requestId: string,
  ): Promise<AuthorizationRequestRow | null> {
    const { data, error } = await supabase
      .from('mcp_oauth_authorization_requests')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as AuthorizationRequestRow | null) ?? null
  }

  async consumeAuthorizationRequest(supabase: SupabaseClient, requestId: string): Promise<void> {
    await supabase
      .from('mcp_oauth_authorization_requests')
      .update({ consumed_at: new Date().toISOString() })
      .eq('request_id', requestId)
  }

  async createToken(supabase: SupabaseClient, row: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('mcp_oauth_tokens').insert(row)
    if (error) throw new BadRequestException(error.message)
  }

  async findTokenByRefreshHash(supabase: SupabaseClient, tokenHash: string) {
    const { data, error } = await supabase
      .from('mcp_oauth_tokens')
      .select('*')
      .eq('refresh_token_hash', tokenHash)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, any> | null
  }

  async revokeRefreshToken(supabase: SupabaseClient, tokenId: string) {
    const { data, error } = await supabase
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', tokenId)
      .is('revoked_at', null)
      .select('*')
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as Record<string, any> | null
  }
}
