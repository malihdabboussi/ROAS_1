import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MediaAssetRow } from '../dto'

@Injectable()
export class MediaUploadRepository {
  private readonly supabase: SupabaseClient

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL')!
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(url, key)
  }

  async downloadStorageObject(bucketName: string, filePath: string): Promise<Blob | null> {
    const { data, error } = await this.supabase.storage.from(bucketName).download(filePath)
    if (error || !data) return null
    return data
  }

  async uploadStorageObject(
    bucketName: string,
    filePath: string,
    body: Buffer,
    options: { contentType: string; upsert: boolean },
  ): Promise<string | null> {
    const { error } = await this.supabase.storage.from(bucketName).upload(filePath, body, options)
    return error?.message ?? null
  }

  async createSignedUrlForPath(
    bucketName: string,
    filePath: string,
    ttlSeconds: number,
  ): Promise<string | null> {
    const { data } = await this.supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, ttlSeconds)
    return data?.signedUrl ?? null
  }

  async createSignedUploadUrl(
    bucketName: string,
    filePath: string,
  ): Promise<{
    signedUrl?: string
    path?: string
    token?: string
    errorMessage: string | null
  }> {
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath)
    return {
      signedUrl: data?.signedUrl,
      path: data?.path,
      token: data?.token,
      errorMessage: error?.message ?? null,
    }
  }

  getPublicUrl(bucketName: string, filePath: string): string {
    const { data } = this.supabase.storage.from(bucketName).getPublicUrl(filePath)
    return data.publicUrl
  }

  async insertMediaAsset(
    row: Record<string, unknown>,
    options: { selectIdOnly?: boolean } = {},
  ): Promise<{ asset: MediaAssetRow | { id: string } | null; errorMessage: string | null }> {
    const insert = this.supabase.from('media_assets').insert(row)
    const selected = options.selectIdOnly ? insert.select('id') : insert.select()
    const { data, error } = await selected.single()
    return {
      asset: (data ?? null) as MediaAssetRow | { id: string } | null,
      errorMessage: error?.message ?? null,
    }
  }

  async findPendingUploadAsset(
    assetId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<MediaAssetRow | null> {
    let qb = this.supabase
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
    if (orgId !== undefined) {
      qb = orgId ? qb.eq('org_id', orgId) : qb.is('org_id', null)
    }
    const { data, error } = await qb.single()
    if (error || !data) return null
    return data as MediaAssetRow
  }

  async confirmPendingUploadAsset(
    assetId: string,
    userId: string,
    patch: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<{ asset: MediaAssetRow | null; errorMessage: string | null }> {
    let updateQb = this.supabase
      .from('media_assets')
      .update(patch)
      .eq('id', assetId)
      .eq('user_id', userId)
    if (orgId !== undefined) {
      updateQb = orgId ? updateQb.eq('org_id', orgId) : updateQb.is('org_id', null)
    }
    const { data, error } = await updateQb.select('*').single()
    return {
      asset: data ? (data as MediaAssetRow) : null,
      errorMessage: error?.message ?? null,
    }
  }

  async campaignBelongsToOrg(campaignId: string, orgId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) return false
    return data !== null
  }

  async getOrgRole(orgId: string, userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    return (data?.role as string | null) ?? null
  }

  async findSpaceForMedia(spaceId: string): Promise<{
    id: string
    user_id?: string
    org_id?: string | null
    visibility?: string
  } | null> {
    const { data, error } = await this.supabase
      .from('spaces')
      .select('id,user_id,org_id,visibility')
      .eq('id', spaceId)
      .maybeSingle()
    if (error || !data) return null
    return data as {
      id: string
      user_id?: string
      org_id?: string | null
      visibility?: string
    }
  }

  async findSpaceShare(input: {
    spaceId: string
    entityType: 'user' | 'org'
    entityId: string
  }): Promise<boolean> {
    const { data } = await this.supabase
      .from('space_shares')
      .select('id')
      .eq('space_id', input.spaceId)
      .eq('entity_type', input.entityType)
      .eq('entity_id', input.entityId)
      .maybeSingle()
    return Boolean(data)
  }
}
