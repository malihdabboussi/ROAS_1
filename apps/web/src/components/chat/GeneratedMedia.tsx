'use client'

import { memo, useCallback, useState } from 'react'
import { AlertCircle, Image as ImageIcon } from 'lucide-react'

type ImageLoadState = 'loading' | 'loaded' | 'error'

interface GeneratedImageProps {
  url: string
  prompt?: string
  aspectRatio?: string
}

function resolveAspectClass(aspectRatio: string): string {
  return aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
}

function GeneratedImageComponent({ url, prompt, aspectRatio = '16:9' }: GeneratedImageProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const aspectClass = resolveAspectClass(aspectRatio)

  const handleRetry = useCallback(() => {
    setLoadState('loading')
    setRetryCount((count) => count + 1)
  }, [])

  const imgSrc = retryCount > 0 ? `${url}${url.includes('?') ? '&' : '?'}_r=${retryCount}` : url

  return (
    <div className="card-glass my-3 w-full max-w-sm overflow-hidden">
      <div className={`bg-muted relative w-full overflow-hidden ${aspectClass}`}>
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
              onClick={handleRetry}
              className="button-glass-neutral rounded-lg px-3 py-1.5 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {loadState !== 'error' && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-20 cursor-pointer"
            title="Open full size"
          >
            <span className="sr-only">Open image in new tab</span>
          </a>
        )}

        {loadState !== 'error' && (
          <img
            src={imgSrc}
            alt={prompt ?? 'Generated image'}
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              loadState === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoadState('loaded')}
            onError={() => setLoadState('error')}
          />
        )}
      </div>

      {prompt && loadState !== 'error' && (
        <div className="bg-secondary px-3 py-1.5">
          <p className="typo-caption text-muted-foreground truncate italic">{prompt}</p>
        </div>
      )}
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
