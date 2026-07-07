import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactMediaAssetsRepository {
  async uploadMediaObject(
    supabase: SupabaseClient,
    input: { filePath: string; buffer: Buffer; contentType: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.storage.from('media').upload(input.filePath, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    })) as { error: QueryError | null }
  }

  async createMediaSignedUrl(
    supabase: SupabaseClient,
    filePath: string,
  ): Promise<{ data: { signedUrl?: string } | null; error: QueryError | null }> {
    return (await supabase.storage.from('media').createSignedUrl(filePath, 365 * 24 * 60 * 60)) as {
      data: { signedUrl?: string } | null
      error: QueryError | null
    }
  }

  async createGeneratedMediaAsset(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('media_assets').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignMediaGenerationConfig(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('campaigns')
      .select('config')
      .eq('id', campaignId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listCampaignMediaAssets(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string | null; assetType: string | null; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('media_assets')
      .select(
        'id, name, original_filename, public_url, mime_type, asset_type, category, tags, created_at',
      )
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(input.limit)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    if (input.assetType) query = query.eq('asset_type', input.assetType)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async createStorageSignedUrl(
    supabase: SupabaseClient,
    input: { bucketName: string; filePath: string; ttlSeconds: number },
  ): Promise<{ data: { signedUrl?: string } | null; error: QueryError | null }> {
    return (await supabase.storage
      .from(input.bucketName)
      .createSignedUrl(input.filePath, input.ttlSeconds)) as {
      data: { signedUrl?: string } | null
      error: QueryError | null
    }
  }

  async findReadableMediaAsset(
    supabase: SupabaseClient,
    input: { assetId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('media_assets')
      .select(
        'id, user_id, org_id, name, original_filename, file_path, bucket_name, file_size, mime_type, asset_type, public_url, page_count, outline, text_layer, document_intelligence',
      )
      .eq('id', input.assetId)
      .eq('user_id', input.userId)
      .limit(1)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async searchMediaAssetChunks(
    supabase: SupabaseClient,
    input: {
      assetId: string
      userId: string
      orgId: string | null
      queryEmbedding: string
      matchCount: number
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase.rpc('search_media_asset_chunks', {
      p_asset_id: input.assetId,
      p_user_id: input.userId,
      p_org_id: input.orgId,
      p_query_embedding: input.queryEmbedding,
      p_match_count: input.matchCount,
      p_min_similarity: 0.3,
    })) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async downloadStorageObject(
    supabase: SupabaseClient,
    input: { bucketName: string; filePath: string },
  ): Promise<{
    data: { arrayBuffer: () => Promise<ArrayBuffer> } | null
    error: QueryError | null
  }> {
    return (await supabase.storage.from(input.bucketName).download(input.filePath)) as {
      data: { arrayBuffer: () => Promise<ArrayBuffer> } | null
      error: QueryError | null
    }
  }

  async createMediaAssetId(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('media_assets').insert(payload).select('id').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
