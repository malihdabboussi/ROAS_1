'use client'

import { Image as ImageIcon } from 'lucide-react'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import { ARTIFACT_INLINE_SHELL_400 } from './artifact-inline-preview.constants'
import { resolveSocialPostVisual } from './artifact-inline-preview.utils'
import { useSocialPostFetch } from './hooks/useSocialPostFetch'
import { SocialPostMiniCreative } from './SocialPostMiniCreative'

const VIDEO_EXT_RE = /\.(mp4|mov|webm|ogg|m4v)(?:\?|$)/i
function looksVideo(u: string) {
  return VIDEO_EXT_RE.test(u) || u.includes('/videos/')
}

export function SocialPostArtifactInlinePreview({
  artifactId,
  name,
  imageUrl,
  videoUrl: videoUrlProp,
  onClick,
}: {
  artifactId: string
  name: string
  imageUrl?: string
  videoUrl?: string
  onClick: () => void
}) {
  const post = useSocialPostFetch(artifactId)

  const platform = post?.platform ?? 'linkedin'
  const isLinkedIn = platform === 'linkedin'
  const previewWidth = 400
  const previewHeight = Math.round(previewWidth * (5 / 4))
  const visual = resolveSocialPostVisual(post)
  const previewTsx = visual.tsx
  const hasTsx = Boolean(previewTsx?.trim())
  const rawImg = visual.image || imageUrl?.trim() || ''
  const rawVid = visual.video || videoUrlProp?.trim() || ''
  const resolvedVideo = rawVid || (rawImg && looksVideo(rawImg) ? rawImg : '')
  const resolvedImage = resolvedVideo === rawImg ? '' : rawImg
  const caption = post?.caption ?? null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_400} flex flex-col`}
    >
      <div
        className="border-border bg-muted relative overflow-hidden border-b"
        style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
      >
        {isLinkedIn ? (
          // Fixed-surface exception: this preview simulates LinkedIn chrome with platform-like colors.
          <div className="flex h-full w-full flex-col overflow-hidden bg-white text-zinc-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100 px-3 py-2">
              <div className="h-7 w-7 shrink-0 rounded-full bg-blue-600" />
              <div className="text-xs font-semibold">Your Brand</div>
            </div>
            {hasTsx && previewTsx ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <SocialPostMiniCreative
                  code={previewTsx}
                  width={previewWidth}
                  height={previewHeight}
                />
              </div>
            ) : resolvedVideo ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <video
                  src={resolvedVideo}
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : resolvedImage ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <img
                  src={resolvedImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : caption ? (
              <div className="body-3 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-3 py-3 text-zinc-800">
                {caption}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-50">
                <ImageIcon className="h-8 w-8 animate-pulse text-zinc-400" />
              </div>
            )}
          </div>
        ) : (
          // Fixed-surface exception: this preview simulates Instagram chrome with platform-like colors.
          <div className="flex h-full w-full flex-col overflow-hidden bg-black text-white">
            <div className="flex shrink-0 items-center gap-2 px-3 py-2">
              <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
              <div className="text-xs font-semibold">your_brand</div>
            </div>
            {hasTsx && previewTsx ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <SocialPostMiniCreative
                  code={previewTsx}
                  width={previewWidth}
                  height={previewHeight}
                />
              </div>
            ) : resolvedVideo ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <video
                  src={resolvedVideo}
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : resolvedImage ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <img
                  src={resolvedImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ) : caption ? (
              <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-3 pb-3 text-sm leading-relaxed">
                {caption}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950">
                <ImageIcon className="h-8 w-8 animate-pulse text-zinc-500" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-3 md:py-spacing-2">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${isLinkedIn ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}
        >
          {isLinkedIn ? 'LI' : 'IG'}
        </span>
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
      </div>
    </button>
  )
}
