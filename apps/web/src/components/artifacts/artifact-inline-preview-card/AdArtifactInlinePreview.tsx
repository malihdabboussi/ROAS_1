'use client'

import { Megaphone } from 'lucide-react'
import { ARTIFACT_INLINE_SHELL_400 } from './artifact-inline-preview.constants'
import { useAdPreview } from './hooks/useAdPreview'
import { SocialPostMiniCreative } from './SocialPostMiniCreative'

export function AdArtifactInlinePreview({
  artifactId,
  name,
  imageUrl,
  onClick,
}: {
  artifactId: string
  name: string
  imageUrl?: string
  onClick: () => void
}) {
  const ad = useAdPreview(artifactId)

  const previewWidth = 400
  const previewHeight = Math.round(previewWidth * (5 / 4))
  const hasTsx = Boolean(ad?.generated_tsx?.trim())
  const resolvedImage = ad?.image_url?.trim() || imageUrl
  const headline = ad?.headline ?? name
  const primaryText = ad?.primary_text ?? null
  const truncatedText = primaryText
    ? primaryText.length > 100
      ? primaryText.slice(0, 100).trimEnd() + '…'
      : primaryText
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_400} flex flex-col`}
    >
      <div className="border-border relative overflow-hidden border-b" style={{ maxHeight: 280 }}>
        {/* Fixed-surface exception: this card previews Meta ad chrome with platform-like colors. */}
        <div className="w-full overflow-hidden bg-white text-zinc-900">
          {truncatedText ? (
            <div className="line-clamp-2 px-3 py-2 text-xs leading-relaxed text-zinc-700">
              {truncatedText}
            </div>
          ) : null}
          {hasTsx ? (
            <div className="overflow-hidden" style={{ maxHeight: 240 }}>
              <SocialPostMiniCreative
                code={ad!.generated_tsx!}
                width={previewWidth}
                height={previewHeight}
              />
            </div>
          ) : resolvedImage ? (
            <img
              src={resolvedImage}
              alt=""
              className="w-full object-cover"
              style={{ maxHeight: 240 }}
            />
          ) : (
            <div className="bg-muted flex h-[200px] items-center justify-center">
              <Megaphone className="text-muted-foreground h-8 w-8 animate-pulse" />
            </div>
          )}
          {headline ? (
            <div className="border-t border-zinc-200 px-3 py-2">
              <p className="line-clamp-1 text-xs font-semibold text-zinc-900">{headline}</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-3 md:py-spacing-2">
        <Megaphone className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{headline}</span>
      </div>
    </button>
  )
}
