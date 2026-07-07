import { cache } from 'react'
import { getServiceClient } from './supabase'

export interface FunnelBundleFile {
  path: string
  content: string
  mime_type: string
  role: string
  funnel_page_id: string | null
}

export interface FunnelBundleAsset {
  path: string
  mime_type: string
  role: string
  url: string | null
}

export interface FunnelPageBundle {
  files: FunnelBundleFile[]
  sharedFiles: FunnelBundleFile[]
  assets: FunnelBundleAsset[]
  hasEntry: boolean
}

/**
 * Fetch the HTML bundle for one funnel page: page-scoped files plus
 * funnel-shared files (funnel_page_id IS NULL) and funnel-wide assets
 * resolved to public/signed URLs. Service-role client, same access path
 * as funnel_pages resolution. Wrapped in React cache so generateMetadata
 * and the page render share one fetch per request.
 */
export const resolveFunnelPageBundle = cache(async function resolveFunnelPageBundle(
  funnelId: string,
  funnelPageId: string,
): Promise<FunnelPageBundle> {
  const supabase = getServiceClient()

  const [{ data: fileRows }, { data: assetRows }] = await Promise.all([
    supabase
      .from('funnel_files')
      .select('path, content, mime_type, role, funnel_page_id')
      .eq('funnel_id', funnelId)
      .or(`funnel_page_id.eq.${funnelPageId},funnel_page_id.is.null`)
      .order('path', { ascending: true }),
    supabase
      .from('funnel_assets')
      .select('path, mime_type, role, media_assets(file_path, bucket_name, public_url)')
      .eq('funnel_id', funnelId)
      .order('path', { ascending: true }),
  ])

  const assets = await Promise.all(
    ((assetRows ?? []) as Record<string, unknown>[]).map(async (asset) => {
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
      return {
        path: String(asset.path),
        mime_type: String(asset.mime_type),
        role: String(asset.role),
        url: publicUrl ?? signedUrl,
      }
    }),
  )

  const allFiles = ((fileRows ?? []) as FunnelBundleFile[]).map((file) => ({
    ...file,
    funnel_page_id: file.funnel_page_id ?? null,
  }))
  const files = allFiles.filter((file) => file.funnel_page_id !== null)
  const sharedFiles = allFiles.filter((file) => file.funnel_page_id === null)

  return {
    files,
    sharedFiles,
    assets,
    hasEntry: files.some((file) => file.path === 'index.html'),
  }
})
