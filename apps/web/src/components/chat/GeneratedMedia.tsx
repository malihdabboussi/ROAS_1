'use client'

import { memo, useCallback } from 'react'
import { AlertCircle, Image as ImageIcon } from 'lucide-react'
import { openMediaAssetInApp } from '@/lib/media/open-media-asset-in-app'
import { useResilientImageSrc } from '@/lib/media/use-resilient-image-src'

interface GeneratedImageProps {
  url: string
  prompt?: string
  aspectRatio?: string
  mediaAssetId?: string
  spaceId?: string | null
}

function resolveAspectClass(aspectRatio: string): string {
  return aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
}

function GeneratedImageComponent({
  url,
  prompt,
  aspectRatio = '16:9',
  mediaAssetId,
  spaceId,
}: GeneratedImageProps) {
  const { loadState, imgSrc, onLoad, onError, retry } = useResilientImageSrc(url)
  const aspectClass = resolveAspectClass(aspectRatio)

  const handleOpen = useCallback(() => {
    void (async () => {
      if (
        mediaAssetId &&
        openMediaAssetInApp({ mediaAssetId, title: prompt, spaceId: spaceId ?? undefined })
      ) {
        return
      }
      const { resolveMediaAssetIdByUrl } = await import('@/lib/services/media-api')
      const resolvedId = await resolveMediaAssetIdByUrl(url)
      if (
        resolvedId &&
        openMediaAssetInApp({
          mediaAssetId: resolvedId,
          title: prompt,
          spaceId: spaceId ?? undefined,
        })
      ) {
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    })()
  }, [mediaAssetId, prompt, spaceId, url])

  return (
    <div className="my-spacing-3 w-full max-w-sm overflow-hidden">
      <div className={`relative w-full overflow-hidden ${aspectClass}`}>
        {loadState === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-full">
              <ImageIcon className="text-muted-foreground h-5 w-5 animate-pulse" />
            </div>
          </div>
        )}

        {loadState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4">
            <div className="bg-secondary flex h-10 w-10 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-5 w-5" />
            </div>
            <p className="text-destructive text-center text-xs">Failed to load image</p>
            <button
              type="button"
              onClick={retry}
              className="button-glass-neutral rounded-lg px-3 py-1.5 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {loadState !== 'error' && (
          <button
            type="button"
            onClick={handleOpen}
            className="absolute inset-0 z-20 cursor-pointer"
            title={mediaAssetId ? 'Open in media workspace' : 'Open full size'}
          >
            <span className="sr-only">
              {mediaAssetId ? 'Open image in media workspace' : 'Open image in new tab'}
            </span>
          </button>
        )}

        {loadState !== 'error' && (
          <img
            src={imgSrc}
            alt={prompt ?? 'Generated image'}
            className={`h-full w-full object-contain transition-opacity duration-500 ${
              loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={onLoad}
            onError={onError}
          />
        )}
      </div>
    </div>
  )
}

export const GeneratedImage = memo(GeneratedImageComponent)

interface GeneratedVideoProps {
  url: string
  prompt?: string
}

function GeneratedVideoComponent({ url, prompt }: GeneratedVideoProps) {
  return (
    <div className="card-glass my-3 w-full max-w-sm overflow-hidden">
      <div className="bg-muted relative w-full overflow-hidden">
        <video src={url} controls className="h-full w-full" preload="metadata" />
      </div>
      {prompt && (
        <div className="bg-secondary flex items-center justify-between gap-2 px-3 py-1.5">
          <p className="typo-caption text-muted-foreground truncate italic">{prompt}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="typo-caption text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
          >
            Download
          </a>
        </div>
      )}
    </div>
  )
}

export const GeneratedVideo = memo(GeneratedVideoComponent)

interface GeneratedAudioProps {
  url: string
  prompt?: string
}

function GeneratedAudioComponent({ url, prompt }: GeneratedAudioProps) {
  return (
    <div className="card-glass my-3 w-full max-w-sm overflow-hidden">
      <div className="bg-muted relative w-full px-3 py-3">
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
      {prompt && (
        <div className="bg-secondary flex items-center justify-between gap-2 px-3 py-1.5">
          <p className="typo-caption text-muted-foreground truncate italic">{prompt}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="typo-caption text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
          >
            Download
          </a>
        </div>
      )}
    </div>
  )
}

export const GeneratedAudio = memo(GeneratedAudioComponent)
