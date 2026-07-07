export async function uploadImageToMedia(
  file: File,
  category: string,
): Promise<{ assetId: string; url: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  formData.append('name', file.name)
  try {
    const { backendUpload } = await import('@/lib/api/backend-client')
    const json = await backendUpload<{
      success?: boolean
      asset?: { id?: string }
      url?: string
      error?: string
    }>('/media/upload', formData)
    if (!json?.success || !json.asset?.id || !json.url) return null
    return { assetId: json.asset.id, url: json.url }
  } catch {
    return null
  }
}
