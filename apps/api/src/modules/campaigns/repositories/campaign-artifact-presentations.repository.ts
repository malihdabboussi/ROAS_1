import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { PresentationCommentRow } from '../services/artifacts.types'

@Injectable()
export class CampaignArtifactPresentationsRepository {
  async createPresentation(
    supabase: SupabaseClient,
    record: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.from('presentations').insert(record).select().single()
    if (error) throw new Error(`Failed to create presentation: ${error.message}`)
    return data as Record<string, unknown>
  }

  /**
   * Summary omits `generated_html` and `slides` — those JSON/HTML blobs can
   * exceed serverless response limits and 500 the All Artifacts list. Detail
   * GET still returns the full row.
   */
  private static readonly PRESENTATION_SUMMARY_COLUMNS =
    'id, user_id, campaign_id, offer_id, name, theme_id, file_url, status, metadata, created_at, updated_at, slug, published_url, domain_id, hide_branding, org_id, space_id'

  async listPresentations(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ): Promise<Array<Record<string, unknown>>> {
    let query = supabase
      .from('presentations')
      .select(
        options?.summary
          ? CampaignArtifactPresentationsRepository.PRESENTATION_SUMMARY_COLUMNS
          : '*',
      )
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list presentations: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async getPresentation(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase.from('presentations').select('*').eq('id', id).single()
    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async updatePresentationMetadata(
    supabase: SupabaseClient,
    presentationId: string,
    metadata: Record<string, unknown>,
  ) {
    return supabase
      .from('presentations')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', presentationId)
  }

  async updatePresentation(
    supabase: SupabaseClient,
    id: string,
    update: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('presentations')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update presentation: ${error.message}`)
    return data as Record<string, unknown>
  }

  async deletePresentation(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('presentations').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete presentation: ${error.message}`)
  }

  async listPresentationFiles(supabase: SupabaseClient, presentationId: string) {
    const { data, error } = await supabase
      .from('presentation_files')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('path', { ascending: true })
    if (error) throw new Error(`Failed to list presentation files: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async getPresentationFile(supabase: SupabaseClient, presentationId: string, path: string) {
    const { data, error } = await supabase
      .from('presentation_files')
      .select('*')
      .eq('presentation_id', presentationId)
      .eq('path', path)
      .maybeSingle()
    if (error) throw new Error(`Failed to read presentation file: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  async upsertPresentationFile(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('presentation_files')
      .upsert(payload, { onConflict: 'presentation_id,path' })
      .select()
      .single()
    if (error) throw new Error(`Failed to write presentation file: ${error.message}`)
    return data as Record<string, unknown>
  }

  async deletePresentationFile(supabase: SupabaseClient, presentationId: string, path: string) {
    const { error } = await supabase
      .from('presentation_files')
      .delete()
      .eq('presentation_id', presentationId)
      .eq('path', path)
    if (error) throw new Error(`Failed to delete presentation file: ${error.message}`)
  }

  async listPresentationAssets(supabase: SupabaseClient, presentationId: string) {
    const { data, error } = await supabase
      .from('presentation_assets')
      .select('*, media_assets(id, file_path, bucket_name, public_url, mime_type, file_size)')
      .eq('presentation_id', presentationId)
      .order('path', { ascending: true })
    if (error) throw new Error(`Failed to list presentation assets: ${error.message}`)
    return Promise.all(
      ((data ?? []) as Array<Record<string, unknown>>).map(async (asset) => {
        const mediaAsset = asset.media_assets as Record<string, unknown> | null | undefined
        const publicUrl =
          typeof mediaAsset?.public_url === 'string' && mediaAsset.public_url.trim()
            ? mediaAsset.public_url
            : null
        const bucketName =
          typeof mediaAsset?.bucket_name === 'string' && mediaAsset.bucket_name.trim()
            ? mediaAsset.bucket_name
            : null
        const filePath =
          typeof mediaAsset?.file_path === 'string' && mediaAsset.file_path.trim()
            ? mediaAsset.file_path
            : null
        let signedUrl: string | null = null
        if (!publicUrl && bucketName && filePath) {
          const { data: signed } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 60 * 60)
          signedUrl = signed?.signedUrl ?? null
        }
        return { ...asset, url: publicUrl ?? signedUrl, signed_url: signedUrl }
      }),
    )
  }

  async findMediaAsset(supabase: SupabaseClient, mediaAssetId: string) {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, mime_type, file_size')
      .eq('id', mediaAssetId)
      .maybeSingle()
    if (error) throw new Error(`Failed to read media asset: ${error.message}`)
    return (data as Record<string, unknown> | null) ?? null
  }

  async upsertPresentationAsset(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('presentation_assets')
      .upsert(payload, { onConflict: 'presentation_id,path' })
      .select()
      .single()
    if (error) throw new Error(`Failed to attach presentation asset: ${error.message}`)
    return data
  }

  async deletePresentationAsset(supabase: SupabaseClient, presentationId: string, path: string) {
    const { error } = await supabase
      .from('presentation_assets')
      .delete()
      .eq('presentation_id', presentationId)
      .eq('path', path)
    if (error) throw new Error(`Failed to detach presentation asset: ${error.message}`)
  }

  async listPresentationComments(supabase: SupabaseClient, presentationId: string) {
    const { data, error } = await supabase
      .from('presentation_comments')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list presentation comments: ${error.message}`)
    return (data ?? []) as PresentationCommentRow[]
  }

  async listProfilesByIds(supabase: SupabaseClient, userIds: string[]) {
    if (userIds.length === 0) return []
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
    return data ?? []
  }

  async upsertPresentationComment(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<PresentationCommentRow> {
    const { data, error } = await supabase
      .from('presentation_comments')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to save presentation comment: ${error.message}`)
    return data as PresentationCommentRow
  }

  async findPresentationComment(
    supabase: SupabaseClient,
    presentationId: string,
    commentId: string,
  ) {
    const { data, error } = await supabase
      .from('presentation_comments')
      .select('*')
      .eq('id', commentId)
      .eq('presentation_id', presentationId)
      .maybeSingle()
    if (error) throw new Error(`Failed to read presentation comment: ${error.message}`)
    return (data as PresentationCommentRow | null) ?? null
  }

  async updatePresentationComment(
    supabase: SupabaseClient,
    presentationId: string,
    commentId: string,
    update: Record<string, unknown>,
  ): Promise<PresentationCommentRow> {
    const { data, error } = await supabase
      .from('presentation_comments')
      .update(update)
      .eq('id', commentId)
      .eq('presentation_id', presentationId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update presentation comment: ${error.message}`)
    return data as PresentationCommentRow
  }

  async deletePresentationComment(
    supabase: SupabaseClient,
    presentationId: string,
    commentId: string,
  ) {
    const { error } = await supabase
      .from('presentation_comments')
      .delete()
      .eq('id', commentId)
      .eq('presentation_id', presentationId)
    if (error) throw new Error(`Failed to delete presentation comment: ${error.message}`)
  }

  async findSlugConflict(id: string, slug: string) {
    const { data } = await this.createServiceClient()
      .from('presentations')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()
    return data ?? null
  }

  async findDomainName(supabase: SupabaseClient, domainId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('domains')
      .select('domain_name')
      .eq('id', domainId)
      .single()
    if (error || !data?.domain_name) return null
    return String(data.domain_name)
  }

  async findGeneratedDomain(userId: string): Promise<string | null> {
    const { data } = await this.createServiceClient()
      .from('domains')
      .select('domain_name')
      .eq('user_id', userId)
      .eq('domain_type', 'generated')
      .eq('status', 'verified')
      .limit(1)
      .single()
    return (data?.domain_name as string | null) ?? null
  }

  async findDomainConflict(domainName: string) {
    const { data } = await this.createServiceClient()
      .from('domains')
      .select('id')
      .eq('domain_name', domainName)
      .limit(1)
      .single()
    return data ?? null
  }

  async insertGeneratedDomain(record: Record<string, unknown>) {
    await this.createServiceClient().from('domains').insert(record)
  }

  private createServiceClient() {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
}
