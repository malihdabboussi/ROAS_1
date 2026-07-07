type AssetRefType = 'image' | 'document' | 'video' | 'audio' | 'other'

function inferAssetType(mimeType: string): AssetRefType {
  const mime = mimeType.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime === 'application/pdf' ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  ) {
    return 'document'
  }
  return 'other'
}

export function buildFormUploadAssetRef(input: {
  formId: string
  filePath: string
  url: string | null
  fileName: string
  mimeType: string
  size: number
}) {
  return {
    kind: 'storage_asset' as const,
    bucket_name: 'media',
    file_path: input.filePath,
    url: input.url,
    mime_type: input.mimeType,
    asset_type: inferAssetType(input.mimeType),
    name: input.fileName,
    original_filename: input.fileName,
    file_size: input.size,
    user_id: null,
    org_id: null,
    source: 'public_form',
    source_surface: 'form_upload',
    metadata: { form_id: input.formId },
  }
}
