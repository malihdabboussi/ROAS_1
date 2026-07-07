import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactSkillAssetsRepository {
  async uploadSkillAsset(
    serviceClient: SupabaseClient,
    input: { storagePath: string; buffer: Buffer; contentType: string },
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const { error: uploadErr } = await serviceClient.storage
      .from('skill-assets')
      .upload(input.storagePath, input.buffer, {
        contentType: input.contentType,
        upsert: false,
      })
    if (uploadErr) return { success: false, error: `Upload failed: ${uploadErr.message}` }

    const { data: urlData } = serviceClient.storage
      .from('skill-assets')
      .getPublicUrl(input.storagePath)
    return { success: true, url: urlData?.publicUrl ?? '' }
  }
}
