import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MediaAssetRow, QueryAssetsInput, UpdateAssetInput } from '../dto'

@Injectable()
export class MediaRepository {
  private readonly supabase: SupabaseClient

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL')!
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(url, key)
  }

  get client(): SupabaseClient {
    return this.supabase
  }

  async getAssetMetadata(assetId: string): Promise<MediaAssetRow | null> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .maybeSingle()
    if (error || !data) return null
    return data as MediaAssetRow
  }

  async createAssetSignedUrl(asset: MediaAssetRow, ttlSeconds: number): Promise<string | null> {
    const { data } = await this.supabase.storage
      .from(asset.bucket_name)
      .createSignedUrl(asset.file_path, ttlSeconds)
    return data?.signedUrl ?? null
  }

  async updateAssetPublicUrl(assetId: string, publicUrl: string) {
    return this.supabase.from('media_assets').update({ public_url: publicUrl }).eq('id', assetId)
  }

  async findAssetById(assetId: string): Promise<MediaAssetRow | null> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .maybeSingle()
    if (error || !data) return null
    return data as MediaAssetRow
  }

  async setAssetConversationId(assetId: string, conversationId: string): Promise<void> {
    await this.supabase
      .from('media_assets')
      .update({ conversation_id: conversationId })
      .eq('id', assetId)
      .is('conversation_id', null)
  }

  /**
   * Prefer media_assets.conversation_id; fall back to the earliest message that
   * references this asset id (content_blocks, metadata, or content).
   */
  async findOriginConversationId(assetId: string): Promise<string | null> {
    const asset = await this.findAssetById(assetId)
    if (!asset) return null
    if (typeof asset.conversation_id === 'string' && asset.conversation_id.trim()) {
      return asset.conversation_id
    }

    const { data, error } = await this.supabase.rpc('find_media_asset_origin_conversation', {
      p_asset_id: assetId,
    })

    if (error) return null
    const conversationId = typeof data === 'string' ? data : null
    if (!conversationId?.trim()) return null

    await this.setAssetConversationId(assetId, conversationId)
    return conversationId
  }

  /** Resolve a media asset id from a signed/public storage URL (chat markdown images). */
  async findAssetIdByUrl(url: string): Promise<string | null> {
    const trimmed = url.trim()
    if (!trimmed) return null

    const filePath = extractMediaStoragePath(trimmed)
    if (filePath) {
      const { data, error } = await this.supabase
        .from('media_assets')
        .select('id')
        .eq('file_path', filePath)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error && data?.id) return String(data.id)
    }

    const { data, error } = await this.supabase
      .from('media_assets')
      .select('id')
      .ilike('public_url', `${trimmed.split('?')[0]}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data?.id) return null
    return String(data.id)
  }

  async listAssets(
    query: QueryAssetsInput,
    input: {
      userId: string
      orgId?: string | null
      hiddenCategoryFilter: string
      spaceId?: string
      sharedCampaign?: boolean
    },
  ): Promise<{ assets: MediaAssetRow[]; total: number; errorMessage: string | null }> {
    let qb = this.supabase
      .from('media_assets')
      .select('*', { count: 'exact' })
      .or(input.hiddenCategoryFilter)
      .order('created_at', { ascending: false })

    if (input.spaceId) {
      qb = qb.eq('space_id', input.spaceId)
    }

    if (input.sharedCampaign && input.orgId && query.campaign_id) {
      qb = qb.eq('org_id', input.orgId).eq('campaign_id', query.campaign_id)
    } else if (input.orgId) {
      qb = qb.eq('org_id', input.orgId)
    } else {
      qb = qb.eq('user_id', input.userId).is('org_id', null)
    }

    if (!input.sharedCampaign && query.campaign_id) qb = qb.eq('campaign_id', query.campaign_id)
    if (query.asset_type) qb = qb.eq('asset_type', query.asset_type)
    if (query.category) qb = qb.eq('category', query.category)
    if (query.search) qb = qb.ilike('name', `%${query.search}%`)

    qb = qb.range(query.offset, query.offset + query.limit - 1)

    const { data, error, count } = await qb
    return {
      assets: (data ?? []) as MediaAssetRow[],
      total: count ?? 0,
      errorMessage: error?.message ?? null,
    }
  }

  async updateAsset(assetId: string, input: UpdateAssetInput): Promise<MediaAssetRow | null> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .update(input)
      .eq('id', assetId)
      .select()
      .single()
    if (error || !data) return null
    return data as MediaAssetRow
  }

  async copyAssetToCampaign(
    original: MediaAssetRow,
    input: { targetCampaignId: string; userId: string; orgId?: string | null },
  ): Promise<{ asset: MediaAssetRow | null; errorMessage: string | null }> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .insert({
        user_id: input.userId,
        name: original.name,
        original_filename: original.original_filename,
        file_path: original.file_path,
        bucket_name: original.bucket_name,
        file_size: original.file_size,
        mime_type: original.mime_type,
        width: original.width,
        height: original.height,
        asset_type: original.asset_type,
        category: original.category,
        subcategory: original.subcategory,
        campaign_id: input.targetCampaignId,
        tags: original.tags,
        description: original.description,
        is_public: original.is_public,
        public_url: original.public_url,
        source: original.source,
        source_model: original.source_model,
        source_prompt: original.source_prompt,
        org_id: input.orgId ?? null,
      })
      .select()
      .single()

    return {
      asset: data ? (data as MediaAssetRow) : null,
      errorMessage: error?.message ?? null,
    }
  }

  async removeAssetStorageObject(
    asset: Pick<MediaAssetRow, 'bucket_name' | 'file_path'>,
  ): Promise<unknown> {
    return this.supabase.storage.from(asset.bucket_name).remove([asset.file_path])
  }

  async deleteAssetRow(assetId: string) {
    return this.supabase.from('media_assets').delete().eq('id', assetId)
  }

  async updateAssetPublicUrlForUser(
    assetId: string,
    userId: string,
    publicUrl: string,
    orgId?: string | null,
  ): Promise<void> {
    let uq = this.supabase
      .from('media_assets')
      .update({ public_url: publicUrl })
      .eq('id', assetId)
      .eq('user_id', userId)
    if (orgId !== undefined) {
      uq = orgId ? uq.eq('org_id', orgId) : uq.is('org_id', null)
    }
    await uq
  }

  async listStalePendingAssets(cutoff: string): Promise<Array<Pick<MediaAssetRow, 'id' | 'bucket_name' | 'file_path'>>> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .select('id, bucket_name, file_path')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
    if (error || !data) return []
    return data as Array<Pick<MediaAssetRow, 'id' | 'bucket_name' | 'file_path'>>
  }

  async markAssetDeleted(assetId: string, options: { clearPublicUrl?: boolean } = {}): Promise<void> {
    await this.supabase
      .from('media_assets')
      .update(options.clearPublicUrl ? { status: 'deleted', public_url: null } : { status: 'deleted' })
      .eq('id', assetId)
  }

  async listExpiredAiAnalysisAssets(now: string): Promise<Array<Pick<MediaAssetRow, 'id' | 'bucket_name' | 'file_path'>>> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .select('id, bucket_name, file_path')
      .eq('status', 'ready')
      .not('deletable_after', 'is', null)
      .lte('deletable_after', now)
    if (error || !data) return []
    return data as Array<Pick<MediaAssetRow, 'id' | 'bucket_name' | 'file_path'>>
  }

  async getUserStorageBytes(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('media_assets')
      .select('file_size')
      .eq('user_id', userId)
      .neq('status', 'deleted')

    if (error || !data) return 0
    return data.reduce((sum, row) => sum + Number(row.file_size ?? 0), 0)
  }

  async findCachedSocialAsset(
    filePath: string,
    userId: string,
    bucketName: string,
    orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    let qb = this.supabase
      .from('media_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('bucket_name', bucketName)
      .eq('file_path', filePath)
      .neq('status', 'deleted')
    if (orgId !== undefined) {
      qb = orgId ? qb.eq('org_id', orgId) : qb.is('org_id', null)
    }
    const { data, error } = await qb.maybeSingle()
    if (error || !data) return null
    return data as MediaAssetRow
  }

  async getStorageObjectMetadata(
    bucketName: string,
    filePath: string,
  ): Promise<{ size: number | null } | null> {
    const slashIdx = filePath.lastIndexOf('/')
    const folder = slashIdx === -1 ? '' : filePath.slice(0, slashIdx)
    const filename = slashIdx === -1 ? filePath : filePath.slice(slashIdx + 1)

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .list(folder, { search: filename })
    if (error || !data || data.length === 0) return null
    const exact = data.find((item) => item.name === filename) ?? data[0]
    return { size: exact?.metadata?.size ? Number(exact.metadata.size) : null }
  }

  async downloadAsset(asset: MediaAssetRow): Promise<Blob | null> {
    const { data, error } = await this.supabase.storage
      .from(asset.bucket_name)
      .download(asset.file_path)
    if (error || !data) return null
    return data
  }

  async updateAssetIndex(assetId: string, patch: Record<string, unknown>) {
    return this.supabase.from('media_assets').update(patch).eq('id', assetId)
  }

  async deleteAssetChunks(assetId: string) {
    return this.supabase.from('media_asset_chunks').delete().eq('asset_id', assetId)
  }

  async insertAssetChunks(rows: Array<Record<string, unknown>>) {
    return this.supabase.from('media_asset_chunks').insert(rows)
  }
}

function extractMediaStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url)
    const markers = ['/object/sign/media/', '/object/public/media/', '/object/authenticated/media/']
    for (const marker of markers) {
      const idx = parsed.pathname.indexOf(marker)
      if (idx >= 0) {
        const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length))
        return path.split('?')[0] || null
      }
    }
  } catch {
    return null
  }
  return null
}
