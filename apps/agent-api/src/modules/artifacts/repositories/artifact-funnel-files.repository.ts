import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }
type FunnelFileRow = Record<string, unknown> & {
  id: string
  path?: string | null
  content?: string | null
  role?: string | null
  funnel_page_id?: string | null
}

@Injectable()
export class ArtifactFunnelFilesRepository {
  async findFunnelFile(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ): Promise<QueryResult<FunnelFileRow>> {
    let query = supabase
      .from('funnel_files')
      .select('*')
      .eq('funnel_id', input.funnelId)
      .eq('path', input.path)
    query = input.funnelPageId
      ? query.eq('funnel_page_id', input.funnelPageId)
      : query.is('funnel_page_id', null)
    return (await query.maybeSingle()) as QueryResult<FunnelFileRow>
  }

  async insertFunnelFile(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: FunnelFileRow; error: QueryError | null }> {
    return (await supabase.from('funnel_files').insert(payload).select().single()) as {
      data: FunnelFileRow
      error: QueryError | null
    }
  }

  async updateFunnelFile(
    supabase: SupabaseClient,
    input: { fileId: string; row: Record<string, unknown> },
  ): Promise<{ data: FunnelFileRow; error: QueryError | null }> {
    return (await supabase
      .from('funnel_files')
      .update(input.row)
      .eq('id', input.fileId)
      .select()
      .single()) as { data: FunnelFileRow; error: QueryError | null }
  }

  async listFunnelPageFiles(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string },
  ): Promise<QueryListResult<FunnelFileRow>> {
    return (await supabase
      .from('funnel_files')
      .select('*')
      .eq('funnel_id', input.funnelId)
      .eq('funnel_page_id', input.funnelPageId)) as QueryListResult<FunnelFileRow>
  }

  async deleteFunnelFileById(
    supabase: SupabaseClient,
    fileId: string,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('funnel_files').delete().eq('id', fileId)) as {
      error: QueryError | null
    }
  }

  async listKnownSharedFiles(
    supabase: SupabaseClient,
    funnelId: string,
  ): Promise<QueryListResult<{ path: string }>> {
    return (await supabase
      .from('funnel_files')
      .select('path')
      .eq('funnel_id', funnelId)
      .is('funnel_page_id', null)) as QueryListResult<{ path: string }>
  }

  async listKnownAssetPaths(
    supabase: SupabaseClient,
    funnelId: string,
  ): Promise<QueryListResult<{ path: string }>> {
    return (await supabase
      .from('funnel_assets')
      .select('path')
      .eq('funnel_id', funnelId)) as QueryListResult<{ path: string }>
  }

  async listFunnelFiles(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ): Promise<QueryListResult<FunnelFileRow>> {
    let query = supabase
      .from('funnel_files')
      .select('id, funnel_id, funnel_page_id, path, role, mime_type, size_bytes, updated_at')
      .eq('funnel_id', input.funnelId)
    if (input.funnelPageId) {
      query = query.or(`funnel_page_id.eq.${input.funnelPageId},funnel_page_id.is.null`)
    }
    return (await query.order('path', { ascending: true })) as QueryListResult<FunnelFileRow>
  }

  async listFunnelFilesForLint(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string },
  ): Promise<QueryListResult<Pick<FunnelFileRow, 'path' | 'content' | 'role'>>> {
    return (await supabase
      .from('funnel_files')
      .select('path, content, role')
      .eq('funnel_id', input.funnelId)
      .eq('funnel_page_id', input.funnelPageId)) as QueryListResult<
      Pick<FunnelFileRow, 'path' | 'content' | 'role'>
    >
  }

  async deleteFunnelFileByPath(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null; path: string },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase
      .from('funnel_files')
      .delete()
      .eq('funnel_id', input.funnelId)
      .eq('path', input.path)
    query = input.funnelPageId
      ? query.eq('funnel_page_id', input.funnelPageId)
      : query.is('funnel_page_id', null)
    return (await query) as { error: QueryError | null }
  }

  async listFunnelAssets(
    supabase: SupabaseClient,
    funnelId: string,
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await supabase
      .from('funnel_assets')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('path', { ascending: true })) as QueryListResult<Record<string, unknown>>
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

  async upsertFunnelAsset(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('funnel_assets')
      .upsert(payload, { onConflict: 'funnel_id,path' })
      .select()
      .single()) as QueryResult<Record<string, unknown>>
  }

  async deleteFunnelAsset(
    supabase: SupabaseClient,
    input: { funnelId: string; path: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('funnel_assets')
      .delete()
      .eq('funnel_id', input.funnelId)
      .eq('path', input.path)) as { error: QueryError | null }
  }

  async listFunnelFilesForTweaks(
    supabase: SupabaseClient,
    input: { funnelId: string; funnelPageId: string | null },
  ): Promise<QueryListResult<Pick<FunnelFileRow, 'funnel_page_id' | 'path' | 'content'>>> {
    let query = supabase
      .from('funnel_files')
      .select('funnel_page_id, path, content')
      .eq('funnel_id', input.funnelId)
    if (input.funnelPageId) {
      query = query.or(`funnel_page_id.eq.${input.funnelPageId},funnel_page_id.is.null`)
    }
    return (await query) as QueryListResult<
      Pick<FunnelFileRow, 'funnel_page_id' | 'path' | 'content'>
    >
  }
}
