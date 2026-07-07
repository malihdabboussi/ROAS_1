'use client'

import { Megaphone } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export function MediaPickerMetaPanel(options: {
  metaImagesLoading: boolean
  metaImages: Array<{ id: string; hash: string; url?: string; name?: string }>
  onSelectUrl: (url: string) => void
  onClose: () => void
}) {
  const { metaImagesLoading, metaImages, onSelectUrl, onClose } = options

  if (metaImagesLoading) {
    return (
      <div className="py-spacing-8 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading Meta images..." />
      </div>
    )
  }

  if (metaImages.length === 0) {
    return (
      <div className="py-spacing-8 flex flex-col items-center justify-center">
        <Megaphone className="text-muted-foreground/30 h-10 w-10" />
        <p className="body-3 text-muted-foreground mt-spacing-2">
          No images in this ad account yet.
        </p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 grid grid-cols-5">
      {metaImages.map((img) => {
        const url = img.url ?? ''
        if (!url) return null
        return (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              onSelectUrl(url)
              onClose()
            }}
            className="rounded-spacing-2 hover:border-border relative aspect-square w-full overflow-hidden border-2 border-transparent transition-all"
          >
            <img
              src={url}
              alt={img.name ?? img.id}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        )
      })}
    </div>
  )
}
