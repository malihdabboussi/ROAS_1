import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ArtifactFormRow = Record<string, any>

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type ListResult<T> = { data: T[] | null; error: QueryError | null }

const FORM_SELECT =
  'id, user_id, org_id, campaign_id, space_id, name, slug, share_token, status, visibility, schema, settings, published_url, created_at, updated_at, copied_from_id'

@Injectable()
export class ArtifactFormsRepository {
  async loadForm(
    supabase: SupabaseClient,
    input: { formId: string; orgId: string | null },
  ): Promise<QueryResult<ArtifactFormRow>> {
    let query = supabase.from('forms').select(FORM_SELECT).eq('id', input.formId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as QueryResult<ArtifactFormRow>
  }

  async findSlugConflict(
    supabase: SupabaseClient,
    input: { campaignId: string; slug: string; formId: string },
  ): Promise<QueryResult<{ id: string }>> {
    return (await supabase
      .from('forms')
      .select('id')
      .eq('campaign_id', input.campaignId)
      .eq('slug', input.slug)
      .neq('id', input.formId)
      .maybeSingle()) as QueryResult<{ id: string }>
  }

  async listForms(
    supabase: SupabaseClient,
    input: {
      campaignId: string
      orgId: string | null
      includeArchived: boolean
      hasSpaceIdFilter: boolean
      spaceId: string | null
      limit: number
    },
  ): Promise<ListResult<ArtifactFormRow>> {
    let query = supabase.from('forms').select(FORM_SELECT).eq('campaign_id', input.campaignId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    if (!input.includeArchived) query = query.neq('status', 'archived')
    if (input.hasSpaceIdFilter) {
      query = input.spaceId ? query.eq('space_id', input.spaceId) : query.is('space_id', null)
    }
    return (await query
      .order('updated_at', { ascending: false })
      .limit(input.limit)) as ListResult<ArtifactFormRow>
  }

  async createForm(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<ArtifactFormRow>> {
    return (await supabase
      .from('forms')
      .insert(payload)
      .select(FORM_SELECT)
      .single()) as QueryResult<ArtifactFormRow>
  }

  async updateForm(
    supabase: SupabaseClient,
    input: { formId: string; patch: Record<string, unknown> },
  ): Promise<QueryResult<ArtifactFormRow>> {
    return (await supabase
      .from('forms')
      .update(input.patch)
      .eq('id', input.formId)
      .select(FORM_SELECT)
      .single()) as QueryResult<ArtifactFormRow>
  }

  async listFormResponses(
    supabase: SupabaseClient,
    input: { formId: string; limit: number },
  ): Promise<ListResult<Record<string, unknown>>> {
    return (await supabase
      .from('form_responses')
      .select('*')
      .eq('form_id', input.formId)
      .order('submitted_at', { ascending: false })
      .limit(input.limit)) as ListResult<Record<string, unknown>>
  }

  async findMediaAsset(
    supabase: SupabaseClient,
    input: { mediaAssetId: string; userId: string; orgId: string | null },
  ): Promise<QueryResult<Record<string, unknown>>> {
    let query = supabase
      .from('media_assets')
      .select(
        'id, user_id, org_id, name, original_filename, file_path, bucket_name, file_size, mime_type, asset_type, public_url',
      )
      .eq('id', input.mediaAssetId)
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async createStorageSignedUrl(
    supabase: SupabaseClient,
    input: { bucketName: string; filePath: string; ttlSeconds: number },
  ): Promise<QueryResult<{ signedUrl?: string }>> {
    return (await supabase.storage
      .from(input.bucketName)
      .createSignedUrl(input.filePath, input.ttlSeconds)) as QueryResult<{ signedUrl?: string }>
  }
}
