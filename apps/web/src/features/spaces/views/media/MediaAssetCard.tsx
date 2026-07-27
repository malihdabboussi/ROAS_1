'use client'

import { MoreVertical, Play } from 'lucide-react'
import type { MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import type { MediaLayoutMode } from '../../types/space-schema'

export function MediaAssetCard({
  asset,
  layout,
  listThumbClass,
  selected,
  onOpen,
  onOpenMenu,
}: {
  asset: MediaAsset
  layout: MediaLayoutMode
  listThumbClass: string
  selected: boolean
  onOpen: () => void
  onOpenMenu: (position: { x: number; y: number }) => void
}) {
  const isVideo = asset.asset_type === 'video'

  return (
    <div
      role="button"
      tabIndex={0}
      data-media-card
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenMenu({ x: event.clientX, y: event.clientY })
      }}
      className={cn(
        'surface-card border-border hover:border-muted-foreground/40 group text-left transition-colors',
        layout === 'list'
          ? 'gap-spacing-3 p-spacing-3 flex flex-row'
          : 'rounded-spacing-3 flex flex-col overflow-hidden border p-0',
        selected && 'border-primary ring-primary/30 ring-2',
      )}
    >
      <div
        className={cn(
          'bg-muted/20 relative overflow-hidden',
          layout === 'list' ? listThumbClass : 'aspect-video w-full',
        )}
      >
        {isVideo && asset.public_url ? (
          <>
            <video
              src={asset.public_url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <span
              aria-hidden
              className="surface-card border-border h-spacing-9 w-spacing-9 absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md"
            >
              <Play className="icon-sm text-foreground" fill="currentColor" />
            </span>
          </>
        ) : asset.public_url ? (
          <img
            src={asset.public_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="body-4 text-muted-foreground p-spacing-2 flex h-full items-center justify-center">
            No preview
          </div>
        )}
        <div
          className="right-spacing-1 top-spacing-1 gap-spacing-1 absolute flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="surface-card rounded-spacing-1 p-spacing-1 inline-flex"
            aria-label={`Options for ${asset.name}`}
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              onOpenMenu({ x: rect.right, y: rect.bottom })
            }}
          >
            <MoreVertical className="icon-sm" />
          </button>
        </div>
      </div>
      <div className={layout === 'list' ? 'py-spacing-1 min-w-0 flex-1' : 'p-spacing-3'}>
        <p className="body-3 text-foreground truncate font-medium">{asset.name}</p>
        <p className="body-4 text-muted-foreground">{isVideo ? 'Video' : 'Image'}</p>
      </div>
    </div>
  )
}
