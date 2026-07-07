import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type PresentationRow = Record<string, unknown> & {
  id: string
  name?: string | null
  status?: string | null
  user_id?: string | null
  org_id?: string | null
  generated_html?: string | null
}

@Injectable()
export class ArtifactPresentationsRepository {
  async listPresentations(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('presentations')
      .select('*')
      .eq('user_id', input.userId)
      .eq('campaign_id', input.campaignId)
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async createPresentation(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: PresentationRow; error: QueryError | null }> {
    return (await supabase
      .from('presentations')
      .insert(payload)
      .select()
      .single()) as { data: PresentationRow; error: QueryError | null }
  }

  async findPresentation(
    supabase: SupabaseClient,
    input: { presentationId: string; userId: string; columns?: string },
  ): Promise<QueryResult<PresentationRow>> {
    return (await supabase
      .from('presentations')
      .select(input.columns ?? '*')
      .eq('id', input.presentationId)
      .eq('user_id', input.userId)
      .maybeSingle()) as QueryResult<PresentationRow>
  }

  async updatePresentation(
    supabase: SupabaseClient,
    input: { presentationId: string; userId?: string; updates: Record<string, unknown> },
  ): Promise<QueryResult<PresentationRow>> {
    let query = supabase.from('presentations').update(input.updates).eq('id', input.presentationId)
    if (input.userId) query = query.eq('user_id', input.userId)
    return (await query.select().maybeSingle()) as QueryResult<PresentationRow>
  }

  async updatePresentationFields(
    supabase: SupabaseClient,
    input: { presentationId: string; userId?: string; updates: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase.from('presentations').update(input.updates).eq('id', input.presentationId)
    if (input.userId) query = query.eq('user_id', input.userId)
    return (await query) as { error: QueryError | null }
  }

  async upsertPresentationFiles(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('presentation_files')
      .upsert(rows, { onConflict: 'presentation_id,path' })
      .select()) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listPresentationFiles(
    supabase: SupabaseClient,
    presentationId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('presentation_files')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('path', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findPresentationFile(
    supabase: SupabaseClient,
    input: { presentationId: string; path: string },
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('presentation_files')
      .select('*')
      .eq('presentation_id', input.presentationId)
      .eq('path', input.path)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async deletePresentationFile(
    supabase: SupabaseClient,
    input: { presentationId: string; path: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('presentation_files')
      .delete()
      .eq('presentation_id', input.presentationId)
      .eq('path', input.path)) as { error: QueryError | null }
  }

  async listPresentationAssets(
    supabase: SupabaseClient,
    presentationId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('presentation_assets')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('path', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findMediaAsset(
    supabase: SupabaseClient,
    mediaAssetId: string,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('media_assets')
      .select('id, mime_type, file_size')
      .eq('id', mediaAssetId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }

  async upsertPresentationAsset(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('presentation_assets')
      .upsert(payload, { onConflict: 'presentation_id,path' })
      .select()
      .single()) as QueryResult<Record<string, unknown>>
  }

  async deletePresentationAsset(
    supabase: SupabaseClient,
    input: { presentationId: string; path: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('presentation_assets')
      .delete()
      .eq('presentation_id', input.presentationId)
      .eq('path', input.path)) as { error: QueryError | null }
  }
}
