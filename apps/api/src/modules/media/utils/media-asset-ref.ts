import { buildVibeyAssetRef } from '@vibey/api-shared'
import type { MediaAssetRef } from '../dto'

export type MediaAssetRefInput = {
  id: string
  bucket_name: string
  file_path: string
  mime_type?: string | null
  asset_type?: string | null
  name?: string | null
  original_filename?: string | null
  file_size?: number | null
  campaign_id?: string | null
  space_id?: string | null
  org_id?: string | null
  source?: string | null
  source_surface?: string | null
  public_url?: string | null
}

export function buildMediaAssetRef(
  asset: MediaAssetRefInput,
  urlOverride?: string | null,
): MediaAssetRef {
  return buildVibeyAssetRef(asset, urlOverride)
}
