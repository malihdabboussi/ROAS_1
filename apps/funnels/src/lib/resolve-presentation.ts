import { getServiceClient } from './supabase'
import type { Presentation } from './types'

/**
 * Resolve a published presentation by its slug.
 * Uses the service-role client (same pattern as resolveFunnelBySlug).
 * Only returns presentations with status = 'published'.
 */
export async function resolvePresentationBySlug(
  slug: string,
  userId?: string | null,
): Promise<Pick<
  Presentation,
  'id' | 'name' | 'generated_html' | 'file_url' | 'slides' | 'hide_branding' | 'metadata' | 'bundle'
> | null> {
  const supabase = getServiceClient()

  let query = supabase
    .from('presentations')
    .select('id, name, generated_html, file_url, slides, status, hide_branding, metadata')
    .eq('slug', slug)
    .eq('status', 'published')

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query.single()

  if (error || !data) return null
  const metadata =
    data.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : null
  const sourceMode = typeof metadata?.source_mode === 'string' ? metadata.source_mode : null
  const entryFile = typeof metadata?.entry_file === 'string' ? metadata.entry_file : 'index.html'
  let bundle: Presentation['bundle'] = null

  if (sourceMode === 'html_bundle') {
    const [{ data: files }, { data: assets }] = await Promise.all([
      supabase
        .from('presentation_files')
        .select('path, content, mime_type, role')
        .eq('presentation_id', data.id)
        .order('path', { ascending: true }),
      supabase
        .from('presentation_assets')
        .select('path, mime_type, role, media_assets(file_path, bucket_name, public_url)')
        .eq('presentation_id', data.id)
        .order('path', { ascending: true }),
    ])
    const resolvedAssets = await Promise.all(
      (assets ?? []).map(async (asset: Record<string, unknown>) => {
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
    const bundleFiles = (files ?? []) as NonNullable<Presentation['bundle']>['files']
    bundle = {
      files: bundleFiles,
      assets: resolvedAssets,
      entry_file: entryFile,
      source_mode: 'html_bundle',
      has_entry: bundleFiles.some((file) => file.path === entryFile),
    }
  }

  return {
    id: data.id as string,
    name: data.name as string,
    generated_html: (data.generated_html as string | null) ?? null,
    file_url: (data.file_url as string | null) ?? null,
    slides: (data.slides as Presentation['slides']) ?? [],
    hide_branding: data.hide_branding as boolean,
    metadata,
    bundle,
  }
}
