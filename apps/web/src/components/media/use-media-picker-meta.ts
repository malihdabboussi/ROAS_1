import { useEffect, useState } from 'react'
import type { MediaSource } from '@/components/media/media-picker-modal.types'
import { fetchMetaAdImages } from '@/lib/artifacts/artifact-preview-api'

export function useMediaPickerMeta(options: {
  open: boolean
  mediaSource: MediaSource
  adAccountId: string | null
}) {
  const { open, mediaSource, adAccountId } = options
  const [metaImages, setMetaImages] = useState<
    Array<{ id: string; hash: string; url?: string; name?: string }>
  >([])
  const [metaImagesLoading, setMetaImagesLoading] = useState(false)

  useEffect(() => {
    if (!open || mediaSource !== 'meta' || !adAccountId) return
    setMetaImagesLoading(true)
    fetchMetaAdImages(adAccountId)
      .then((data) => setMetaImages(data))
      .catch(() => setMetaImages([]))
      .finally(() => setMetaImagesLoading(false))
  }, [open, mediaSource, adAccountId])

  return { metaImages, metaImagesLoading }
}
