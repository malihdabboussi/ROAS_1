import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class BrainLiveDocumentRepository {
  async findMediaAsset(
    supabase: SupabaseClient,
    input: { assetId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('media_assets')
      .select(
        'id, user_id, org_id, name, original_filename, file_path, bucket_name, file_size, mime_type, page_count, text_layer, outline, public_url, document_intelligence',
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

  async createSignedUrl(
    supabase: SupabaseClient,
    input: { bucketName: string; filePath: string; expiresInSeconds: number },
  ): Promise<string | null> {
    const { data } = await supabase.storage
      .from(input.bucketName)
      .createSignedUrl(input.filePath, input.expiresInSeconds)
    return data?.signedUrl ?? null
  }

  async searchMediaAssetChunks(
    supabase: SupabaseClient,
    input: {
      assetId: string
      userId: string
      orgId: string | null
      queryEmbedding: string
      matchCount: number
      minSimilarity: number
    },
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await supabase.rpc('search_media_asset_chunks', {
      p_asset_id: input.assetId,
      p_user_id: input.userId,
      p_org_id: input.orgId,
      p_query_embedding: input.queryEmbedding,
      p_match_count: input.matchCount,
      p_min_similarity: input.minSimilarity,
    })
    return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
  }

  async downloadStorageObject(
    supabase: SupabaseClient,
    input: { bucketName: string; filePath: string },
  ): Promise<{ data: { arrayBuffer(): Promise<ArrayBuffer> } | null; error: QueryError | null }> {
    return (await supabase.storage
      .from(input.bucketName)
      .download(input.filePath)) as {
      data: { arrayBuffer(): Promise<ArrayBuffer> } | null
      error: QueryError | null
    }
  }
}
