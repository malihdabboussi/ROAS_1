import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message?: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }
type SingleResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }
type MutationResult = { error: QueryError | null }

type ListQuery<T = Record<string, unknown>> = PromiseLike<ListResult<T>> & {
  eq(field: string, value: unknown): ListQuery<T>
  in(field: string, values: unknown[]): ListQuery<T>
  is(field: string, value: null): ListQuery<T>
  limit(count: number): ListQuery<T>
  order(field: string, options?: { ascending?: boolean }): ListQuery<T>
  maybeSingle<R = T>(): Promise<SingleResult<R>>
}

type MutationQuery = PromiseLike<MutationResult> & {
  eq(field: string, value: unknown): MutationQuery
}

type TableQuery = {
  insert(rows: readonly Record<string, unknown>[]): Promise<MutationResult>
  select<T = Record<string, unknown>>(columns: string): ListQuery<T>
  update(patch: Record<string, unknown>): MutationQuery
}

@Injectable()
export class ChatAttachmentContextRepository {
  async insertConversationDocuments(
    supabase: SupabaseClient,
    rows: readonly Record<string, unknown>[],
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'conversation_documents').insert(rows)
    return error
  }

  async listPreviousImageUploads(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'conversation_documents')
      .select('title, content')
      .eq('conversation_id', conversationId)
      .eq('document_type', 'image_upload')
      .order('created_at', { ascending: true })
      .limit(50)
  }

  async updateMediaAssetDocumentCache(
    supabase: SupabaseClient,
    input: { mediaAssetId: string; patch: Record<string, unknown> },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'media_assets')
      .update(input.patch)
      .eq('id', input.mediaAssetId)
    return error
  }

  async findMediaAssetDocumentCache(
    supabase: SupabaseClient,
    input: { mediaAssetId: string; userId: string; orgId: string | null },
  ): Promise<SingleResult> {
    let query = this.table(supabase, 'media_assets')
      .select('id, text_layer, document_intelligence, page_count, public_url, file_size, mime_type')
      .eq('id', input.mediaAssetId)
      .eq('user_id', input.userId)
      .limit(1)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return query.maybeSingle()
  }

  async findSpaceItemIdByMediaReference(
    supabase: SupabaseClient,
    input: { spaceId: string; mediaId: string },
  ): Promise<string | null> {
    const { data } = await this.table(supabase, 'space_items')
      .select<{ id?: string }>('id')
      .eq('space_id', input.spaceId)
      .eq('custom_data->>media_id', input.mediaId)
      .limit(1)
    const match = data?.[0]
    return typeof match?.id === 'string' ? match.id : null
  }

  async listSpaceItemsByIds(
    supabase: SupabaseClient,
    itemIds: readonly string[],
  ): Promise<ListResult> {
    return this.table(supabase, 'space_items')
      .select('id, space_id, custom_data')
      .in('id', [...itemIds])
      .limit(itemIds.length)
  }

  async listMediaReferences(
    supabase: SupabaseClient,
    input: { userId: string; mediaIds: readonly string[]; limit: number },
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await this.table(supabase, 'media_assets')
      .select('id, name, original_filename, public_url, mime_type, asset_type')
      .eq('user_id', input.userId)
      .in('id', [...input.mediaIds])
      .limit(input.limit)
    return data ?? []
  }

  async listMissionReferences(
    supabase: SupabaseClient,
    input: { userId: string; missionIds: readonly string[]; limit: number },
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await this.table(supabase, 'missions')
      .select('id, title, status, assigned_agent_key')
      .eq('user_id', input.userId)
      .in('id', [...input.missionIds])
      .limit(input.limit)
    return data ?? []
  }

  async listUserNotificationsByIds(
    supabase: SupabaseClient,
    notificationIds: readonly string[],
  ): Promise<ListResult> {
    if (notificationIds.length === 0) return { data: [], error: null }
    return this.table(supabase, 'user_notifications')
      .select('id, type, title, body, mission_id, action_url, metadata')
      .in('id', [...notificationIds])
      .limit(notificationIds.length)
  }

  async listAwarenessPointsByIds(
    supabase: SupabaseClient,
    pointIds: readonly string[],
  ): Promise<ListResult> {
    if (pointIds.length === 0) return { data: [], error: null }
    return this.table(supabase, 'agent_awareness_points')
      .select('id, point_type, content, agent_key, campaign_id')
      .in('id', [...pointIds])
      .limit(pointIds.length)
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
