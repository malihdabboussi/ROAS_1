'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import type { MediaBatchImage } from './use-media-image-generation'

interface MediaGeneratePreviewStageProps {
  previewImageUrl: string | null
  isGenerating: boolean
  progressMessage: string
  progress: number
  currentBatchImages: MediaBatchImage[]
  selectedBatchIndex: number
  onSelectBatchImage: (index: number) => void
}

export function MediaGeneratePreviewStage({
  previewImageUrl,
  isGenerating,
  progressMessage,
  progress,
  currentBatchImages,
  selectedBatchIndex,
  onSelectBatchImage,
}: MediaGeneratePreviewStageProps) {
  return (
    <>
      <div className="border-border bg-muted/20 relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border">
        {previewImageUrl && !isGenerating ? (
          <img src={previewImageUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : isGenerating ? (
          <div className="bg-background/90 gap-spacing-3 absolute inset-0 flex flex-col items-center justify-center">
            <VibeyLoadingOrb state="processing" size="md" />
            <p className="body-3 text-muted-foreground max-w-[90%] text-center">
              {progressMessage || 'Generating...'}
            </p>
            <div className="bg-muted-foreground/30 h-1.5 w-[80%] overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${Math.max(5, Math.min(100, progress * 100 || 0))}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="body-4 text-muted-foreground">Generated image will appear here</span>
        )}
      </div>

      {currentBatchImages.length > 1 && !isGenerating ? (
        <div className="flex flex-wrap justify-center gap-2">
          {currentBatchImages.map((image, index) => {
            const isSelected = selectedBatchIndex === index
            return (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => onSelectBatchImage(index)}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-foreground ring-foreground/25 ring-2'
                    : 'border-border hover:border-muted-foreground',
                )}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </button>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
