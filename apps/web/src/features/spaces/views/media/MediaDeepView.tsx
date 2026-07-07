'use client'

import { useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { getAsset, type MediaAsset } from '@/lib/services/media-api'
import { useMediaDetailQuery } from '../../components/media/use-media-detail-query'

export function MediaDeepView({
  onDeepMetaChange,
}: {
  onDeepMetaChange?: (meta: { id: string; title: string }) => void
}) {
  const { mediaId } = useMediaDetailQuery()
  const [asset, setAsset] = useState<MediaAsset | null>(null)

  useEffect(() => {
    if (!mediaId) {
      setAsset(null)
      return
    }
    let cancelled = false
    void getAsset(mediaId).then((row) => {
      if (!cancelled) setAsset(row)
    })
    return () => {
      cancelled = true
    }
  }, [mediaId])

  useEffect(() => {
    if (!asset?.id || !onDeepMetaChange) return
    onDeepMetaChange({ id: asset.id, title: asset.name })
  }, [asset?.id, asset?.name, onDeepMetaChange])

  if (!mediaId || !asset) {
    return (
      <div className="py-spacing-12 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading media…" state="processing" size="lg" />
      </div>
    )
  }

  const isVideo = asset.asset_type === 'video'

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col">
          <div className="bg-muted/10 border-border rounded-spacing-3 p-spacing-4 flex min-h-[320px] items-center justify-center border">
            {isVideo && asset.public_url ? (
              <video
                src={asset.public_url}
                controls
                className="rounded-spacing-2 max-h-[70vh] w-full"
              />
            ) : asset.public_url ? (
              <img
                src={asset.public_url}
                alt=""
                className="rounded-spacing-2 max-h-[70vh] w-full object-contain"
              />
            ) : (
              <span className="body-3 text-muted-foreground">No preview</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
