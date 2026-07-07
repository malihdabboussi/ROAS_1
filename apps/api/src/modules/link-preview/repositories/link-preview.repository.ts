import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LinkPreview } from '../link-preview.types'

@Injectable()
export class LinkPreviewRepository {
  async findCachedPreview(
    supabase: SupabaseClient,
    urlHash: string,
  ): Promise<{ payload: LinkPreview; expires_at: string } | null> {
    const { data, error } = await supabase
      .from('link_preview_cache')
      .select('payload, expires_at')
      .eq('url_hash', urlHash)
      .maybeSingle()
    if (error || !data) return null
    return data as { payload: LinkPreview; expires_at: string }
  }

  async upsertCachedPreview(
    supabase: SupabaseClient,
    input: {
      urlHash: string
      url: string
      provider: LinkPreview['provider']
      payload: LinkPreview
      fetchedAt: string
      expiresAt: string
    },
  ): Promise<void> {
    await supabase.from('link_preview_cache').upsert(
      {
        url_hash: input.urlHash,
        url: input.url,
        provider: input.provider,
        payload: input.payload,
        fetched_at: input.fetchedAt,
        expires_at: input.expiresAt,
      },
      { onConflict: 'url_hash' },
    )
  }
}
