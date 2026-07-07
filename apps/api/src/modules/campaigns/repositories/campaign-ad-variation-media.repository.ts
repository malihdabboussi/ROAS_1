import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignAdVariationMediaRepository {
  async uploadVariationImage(
    supabase: SupabaseClient,
    storagePath: string,
    imageBytes: Buffer,
    contentType: string,
  ) {
    const { error } = await supabase.storage.from('media').upload(storagePath, imageBytes, {
      contentType,
      upsert: false,
    })
    if (error) throw new Error(`Failed to upload variation: ${error.message}`)
  }

  async createVariationSignedUrl(supabase: SupabaseClient, storagePath: string) {
    const { data } = await supabase.storage
      .from('media')
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60)
    return data?.signedUrl ?? ''
  }

  async createMediaAsset(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('media_assets')
      .insert(payload)
      .select('id')
      .single()
    return { data, error }
  }
}
