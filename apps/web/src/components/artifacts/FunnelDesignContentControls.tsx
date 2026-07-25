'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type { FunnelElementTrace } from '@/lib/artifacts/comment-artifact-types'
import type { FunnelDirectEditPatch } from '@/lib/artifacts/funnel-direct-edit'

interface FunnelDesignContentControlsProps {
  selectedTrace: FunnelElementTrace
  selectedTag: string | null
  canEditText: boolean
  textValue: string
  altValue: string
  onTextValueChange: (value: string) => void
  onAltValueChange: (value: string) => void
  onLiveContent: (content: { text?: string; attributes?: Record<string, string> }) => void
  onPersistPatch: (patch: FunnelDirectEditPatch) => boolean
}

export function FunnelDesignContentControls({
  selectedTrace,
  selectedTag,
  canEditText,
  textValue,
  altValue,
  onTextValueChange,
  onAltValueChange,
  onLiveContent,
  onPersistPatch,
}: FunnelDesignContentControlsProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const isImage = selectedTag === 'img'

  return (
    <>
      {canEditText ? (
        <label className="gap-spacing-2 flex flex-col">
          <span className="typo-section-label text-muted-foreground">Content</span>
          <textarea
            value={textValue}
            rows={3}
            onChange={(event) => {
              const value = event.target.value
              onTextValueChange(value)
              onLiveContent({ text: value })
            }}
            onBlur={() => {
              if (textValue !== selectedTrace.text_snapshot) {
                onPersistPatch({ type: 'text', value: textValue })
              }
            }}
            className="input-glass body-3 text-foreground rounded-spacing-2 border-border p-spacing-3 w-full resize-y border"
          />
        </label>
      ) : null}

      {isImage ? (
        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Image</p>
          <button
            type="button"
            onClick={() => setMediaPickerOpen(true)}
            className="button-glass-neutral gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center justify-center"
          >
            <ImageIcon className="icon-sm" />
            Replace image
          </button>
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">Alt text</span>
            <input
              value={altValue}
              onChange={(event) => onAltValueChange(event.target.value)}
              onBlur={() => {
                if (altValue !== (selectedTrace.attributes?.alt ?? '')) {
                  onPersistPatch({ type: 'attribute', name: 'alt', value: altValue })
                }
              }}
              className="input-glass h-spacing-9 rounded-spacing-2 border-border px-spacing-3 body-3 text-foreground w-full border"
              placeholder="Describe this image"
            />
          </label>
        </div>
      ) : null}

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          if (onPersistPatch({ type: 'attribute', name: 'src', value: url })) {
            onLiveContent({ attributes: { src: url } })
            setMediaPickerOpen(false)
          }
        }}
      />
    </>
  )
}
