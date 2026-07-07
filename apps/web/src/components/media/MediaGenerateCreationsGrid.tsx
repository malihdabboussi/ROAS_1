'use client'

import { Trash2 } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import type { MediaGeneratedImage } from './use-media-image-generation'

interface MediaGenerateCreationsGridProps {
  generatedImages: MediaGeneratedImage[]
  isLoadingCreations: boolean
  previewImageUrl: string | null
  onPreviewImage: (url: string) => void
  onDeleteGeneratedImage: (imageId: string, imageUrl: string) => void
}

export function MediaGenerateCreationsGrid({
  generatedImages,
  isLoadingCreations,
  previewImageUrl,
  onPreviewImage,
  onDeleteGeneratedImage,
}: MediaGenerateCreationsGridProps) {
  return (
    <div className="border-border border-t pt-4">
      <h3 className="body-2 text-foreground mb-2 font-medium">Your creations</h3>
      {isLoadingCreations ? (
        <div className="flex justify-center py-6">
          <VibeyLoadingOrb state="processing" size="sm" />
        </div>
      ) : generatedImages.length === 0 ? (
        <p className="body-4 text-muted-foreground">No AI-generated images yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {generatedImages.map((img) => (
            <div key={img.id || img.url} className="group/img relative">
              <button
                type="button"
                onClick={() => onPreviewImage(img.url)}
                className={cn(
                  'aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors',
                  previewImageUrl === img.url
                    ? 'border-foreground'
                    : 'border-border hover:border-muted-foreground',
                )}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
              {img.id ? (
                <button
                  type="button"
                  onClick={() => onDeleteGeneratedImage(img.id, img.url)}
                  className="absolute right-1 top-1 rounded bg-secondary p-1 opacity-0 transition-opacity group-hover/img:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
