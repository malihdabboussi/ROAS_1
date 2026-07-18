'use client'

import { FolderOpen, Megaphone, X } from 'lucide-react'
import type { MediaSource } from '@/components/media/media-picker-modal.types'

export function MediaPickerModalHeader(options: {
  onClose: () => void
  adAccountId: string | null
  mediaSource: MediaSource
  setMediaSource: (s: MediaSource) => void
}) {
  const { onClose, adAccountId, mediaSource, setMediaSource } = options

  return (
    <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-4">
      <div className="mb-spacing-4 flex items-center justify-between">
        <div>
          <h2 className="title-h3 text-foreground uppercase">MEDIA LIBRARY</h2>
          <p className="body-3 text-muted-foreground">
            Browse, upload, and manage your campaign assets.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close media library"
          onClick={onClose}
          className="btn-icon-bare rounded-spacing-2"
        >
          <X className="icon-md" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {adAccountId && (
          <>
            <button
              type="button"
              onClick={() => setMediaSource('library')}
              className={`pill pill--sm ${mediaSource === 'library' ? 'pill--active' : ''}`}
            >
              <span className="relative z-10 flex items-center gap-1">
                <FolderOpen className="icon-xs" />
                Library
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMediaSource('meta')}
              className={`pill pill--sm ${mediaSource === 'meta' ? 'pill--active' : ''}`}
            >
              <span className="relative z-10 flex items-center gap-1">
                <Megaphone className="icon-xs" />
                Meta
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
