import { Injectable } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { WordpressConnectionMetadata, WordpressUserIntegration } from '../types/wordpress.types'

const SELECT_FIELDS =
  'id,user_id,integration_id,provider,status,connected_at,metadata,connection_label,scope_mode,is_default'

@Injectable()
export class WordpressRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async getConnection(scope: RequestScope): Promise<WordpressUserIntegration | null> {
    let query = this.serviceClient.client
      .from('user_integrations')
      .select(SELECT_FIELDS)
      .eq('integration_id', 'wordpress')
      .neq('status', 'disconnected')

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', scope.userId).is('org_id', null)
    }

    const { data, error } = await query.order('is_default', { ascending: false }).order('updated_at', {
      ascending: false,
    })
    if (error || !data) return null

    const rows = data as WordpressUserIntegration[]
    if (!scope.orgId) return rows[0] ?? null
    return (
      rows.find((row) => row.scope_mode === 'org_shared') ??
      rows.find((row) => row.scope_mode === 'personal' && row.user_id === scope.userId) ??
      null
    )
  }

  async upsertConnection(params: {
    scope: RequestScope
    ownerUserId: string
    status: 'pending' | 'connected' | 'error'
    metadata: WordpressConnectionMetadata
    connectionLabel: string | null
    connectionScope?: 'personal' | 'org_shared'
  }): Promise<WordpressUserIntegration> {
    const now = new Date().toISOString()
    const scopeMode =
      params.scope.orgId && params.connectionScope === 'org_shared' ? 'org_shared' : 'personal'

    let existingQuery = this.serviceClient.client
      .from('user_integrations')
      .select('id')
      .eq('integration_id', 'wordpress')
      .eq('scope_mode', scopeMode)

    if (params.scope.orgId) {
      existingQuery = existingQuery.eq('org_id', params.scope.orgId)
      if (scopeMode === 'personal') existingQuery = existingQuery.eq('user_id', params.ownerUserId)
    } else {
      existingQuery = existingQuery.eq('user_id', params.ownerUserId).is('org_id', null)
    }

    const { data: existing } = await existingQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle()

    const row = {
      user_id: params.ownerUserId,
      org_id: params.scope.orgId ?? null,
      integration_id: 'wordpress',
      provider: 'wordpress',
      status: params.status,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: params.status === 'connected' ? now : null,
      error_message: null,
      metadata: params.metadata,
      connection_label: params.connectionLabel,
      scope_mode: scopeMode,
      is_default: scopeMode === 'org_shared',
      updated_at: now,
    }

    if (existing?.id) {
      const { data, error } = await this.serviceClient.client
        .from('user_integrations')
        .update(row)
        .eq('id', existing.id)
        .select(SELECT_FIELDS)
        .maybeSingle()
      if (error || !data) throw error ?? new Error('Failed to update WordPress connection')
      return data as WordpressUserIntegration
    }

    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .insert(row)
      .select(SELECT_FIELDS)
      .maybeSingle()
    if (error || !data) throw error ?? new Error('Failed to insert WordPress connection')
    return data as WordpressUserIntegration
  }

  async disconnect(rowId: string, metadata: Record<string, unknown>): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        error_message: null,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rowId)
    if (error) throw error
  }

  async getBlogPostForUser(blogPostId: string, userId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.serviceClient.client
      .from('blog_posts')
      .select('*')
      .eq('id', blogPostId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) throw error ?? new Error('Blog post not found')
    return data as Record<string, unknown>
  }

  async updateBlogPostMetadata(
    blogPostId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('blog_posts')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', blogPostId)
    if (error) throw error
  }
}
