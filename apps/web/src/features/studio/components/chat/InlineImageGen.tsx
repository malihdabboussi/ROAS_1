'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  generateImageStream,
  type GenerateImageParams,
  type GenerationProgress,
  type GenerationResult,
  type MediaAsset,
} from '@/lib/services/media-api'

// ============================================================================
// Types
// ============================================================================

interface InlineImageGenProps {
  /** The prompt to generate */
  prompt: string
  /** Aspect ratio (default: 16:9) */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '3:2' | '4:3'
  /** Campaign context */
  campaignId?: string
  /** Category for the generated asset */
  category?: string
  /** Called when generation completes with the asset */
  onComplete?: (asset: MediaAsset, url: string) => void
  /** Called on error */
  onError?: (error: string) => void
  /** Auto-start generation on mount */
  autoStart?: boolean
}

type GenState = 'idle' | 'generating' | 'uploading' | 'complete' | 'error'

// ============================================================================
// Progress bar with animated gradient
// ============================================================================

function ProgressBar({ progress, stage }: { progress: number; stage: GenState }) {
  const width = Math.max(5, Math.min(100, progress * 100))

  return (
    <div className="bg-surface-2 relative h-1.5 w-full overflow-hidden rounded-full">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
          stage === 'complete'
            ? 'bg-emerald-500'
            : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500'
        }`}
        style={{ width: `${width}%` }}
      />
      {stage !== 'complete' && stage !== 'error' && (
        <div
          className="absolute inset-0 animate-pulse rounded-full opacity-30"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

function InlineImageGenComponent({
  prompt,
  aspectRatio = '16:9',
  campaignId,
  category,
  onComplete,
  onError,
  autoStart = true,
}: InlineImageGenProps) {
  const [state, setState] = useState<GenState>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(false)

  const generate = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true

    const controller = new AbortController()
    abortRef.current = controller

    setState('generating')
    setProgress(0)
    setStatusMessage('Initializing...')
    setError(null)

    const params: GenerateImageParams = {
      prompt,
      aspect_ratio: aspectRatio,
      campaign_id: campaignId,
      category,
      tags: ['ai-generated'],
    }

    try {
      await generateImageStream(
        params,
        {
          onStart: () => {
            setState('generating')
            setStatusMessage('Creating your image...')
          },
          onProgress: (p: GenerationProgress) => {
            setState(p.stage === 'uploading' ? 'uploading' : 'generating')
            setProgress(p.progress)
            setStatusMessage(p.message)
          },
          onComplete: (result: GenerationResult) => {
            setState('complete')
            setProgress(1)
            setStatusMessage('Done!')
            if (result.url) setImageUrl(result.url)
            if (result.asset && result.url) {
              onComplete?.(result.asset, result.url)
            }
          },
          onError: (err: string) => {
            setState('error')
            setError(err)
            onError?.(err)
          },
        },
        controller.signal,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.IMAGE_GENERATION
      setState('error')
      setError(msg)
      onError?.(msg)
    }
  }, [prompt, aspectRatio, campaignId, category, onComplete, onError])

  // Auto-start
  useEffect(() => {
    if (autoStart && state === 'idle') {
      generate()
    }
    return () => {
      abortRef.current?.abort()
    }
  }, [autoStart, state, generate])

  // Aspect ratio to CSS
  const aspectMap: Record<string, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '3:2': 'aspect-[3/2]',
    '4:3': 'aspect-[4/3]',
  }
  const aspectClass = aspectMap[aspectRatio] ?? 'aspect-video'

  return (
    <div className="my-3 w-full max-w-lg overflow-hidden rounded-xl">
      {/* Image container with loading state */}
      <div className={`bg-surface-2 relative w-full overflow-hidden rounded-xl ${aspectClass}`}>
        {/* Generating placeholder */}
        {state !== 'complete' && state !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            {/* Animated gradient background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #db2777 25%, #7c3aed 50%, #2563eb 75%, #7c3aed 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradient-shift 4s ease infinite',
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-3">
              {/* Pulsing icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <svg
                  className="h-6 w-6 animate-pulse text-white/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
                  />
                </svg>
              </div>

              <p className="text-shimmer-gradient text-center text-xs font-medium">
                {statusMessage}
              </p>

              {/* Progress bar */}
              <div className="w-48">
                <ProgressBar progress={progress} stage={state} />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-center text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => {
                startedRef.current = false
                setState('idle')
                generate()
              }}
              className="card-glass-interactive rounded-lg px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Generated image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={prompt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        )}
      </div>

      {/* Caption (prompt) — shown after completion */}
      {state === 'complete' && imageLoaded && (
        <div className="mt-1.5 px-1">
          <p className="text-muted-foreground truncate text-[10px] italic">{prompt}</p>
        </div>
      )}
    </div>
  )
}

export const InlineImageGen = memo(InlineImageGenComponent)

// ============================================================================
// Image display for already-generated images (from message content)
// ============================================================================

type ImageLoadState = 'loading' | 'loaded' | 'error'

interface GeneratedImageProps {
  url: string
  prompt?: string
  aspectRatio?: string
}

function GeneratedImageComponent({ url, prompt, aspectRatio = '16:9' }: GeneratedImageProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading')
  const [retryCount, setRetryCount] = useState(0)

  const aspectMap: Record<string, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '3:2': 'aspect-[3/2]',
    '4:3': 'aspect-[4/3]',
  }
  const aspectClass = aspectMap[aspectRatio] ?? 'aspect-video'

  const handleRetry = useCallback(() => {
    setLoadState('loading')
    setRetryCount((c) => c + 1)
  }, [])

  // Append cache-buster on retry
  const imgSrc = retryCount > 0 ? `${url}${url.includes('?') ? '&' : '?'}_r=${retryCount}` : url

  return (
    <div className="card-glass my-3 w-full max-w-[400px] overflow-hidden">
      <div className={`bg-surface-2 relative w-full overflow-hidden ${aspectClass}`}>
        {/* Loading shimmer */}
        {loadState === 'loading' && (
          <div className="absolute inset-0 z-10">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #db2777 25%, #7c3aed 50%, #2563eb 75%, #7c3aed 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradient-shift 4s ease infinite',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg
                  className="h-5 w-5 animate-pulse text-white/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {loadState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
                />
              </svg>
            </div>
            <p className="text-center text-xs text-red-400/80">Failed to load image</p>
            <button
              type="button"
              onClick={handleRetry}
              className="card-glass-interactive rounded-lg px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Click-to-open wrapper */}
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

        {/* The image */}
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

      {/* Caption / alt text */}
      {prompt && loadState !== 'error' && (
        <div className="bg-surface-2/50 px-3 py-1.5">
          <p className="text-muted-foreground truncate text-[11px] italic">{prompt}</p>
        </div>
      )}
    </div>
  )
}

export const GeneratedImage = memo(GeneratedImageComponent)

// ============================================================================
// Video display for already-generated videos (from message content)
// ============================================================================

interface GeneratedVideoProps {
  url: string
  prompt?: string
}

function GeneratedVideoComponent({ url, prompt }: GeneratedVideoProps) {
  return (
    <div className="card-glass my-3 w-full max-w-[400px] overflow-hidden">
      <div className="bg-surface-2 relative w-full overflow-hidden">
        <video src={url} controls className="h-full w-full" preload="metadata" />
      </div>
      {prompt && (
        <div className="bg-surface-2/50 flex items-center justify-between gap-2 px-3 py-1.5">
          <p className="text-muted-foreground truncate text-[11px] italic">{prompt}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="text-muted-foreground hover:text-foreground flex-shrink-0 text-[10px] transition-colors"
          >
            Download
          </a>
        </div>
      )}
    </div>
  )
}

export const GeneratedVideo = memo(GeneratedVideoComponent)

// ============================================================================
// Audio display for processed/generated audio (from message content)
// ============================================================================

interface GeneratedAudioProps {
  url: string
  prompt?: string
}

function GeneratedAudioComponent({ url, prompt }: GeneratedAudioProps) {
  return (
    <div className="card-glass my-3 w-full max-w-[400px] overflow-hidden">
      <div className="bg-surface-2 relative w-full px-3 py-3">
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
      {prompt && (
        <div className="bg-surface-2/50 flex items-center justify-between gap-2 px-3 py-1.5">
          <p className="text-muted-foreground truncate text-[11px] italic">{prompt}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="text-muted-foreground hover:text-foreground flex-shrink-0 text-[10px] transition-colors"
          >
            Download
          </a>
        </div>
      )}
    </div>
  )
}

export const GeneratedAudio = memo(GeneratedAudioComponent)
