'use client'

import { X } from 'lucide-react'
import { DeliverablePreview } from './MediaDeliverables'
import {
  AudioPreview,
  DocumentPreview,
  FilePreview,
  ImagePreview,
  VideoPreview,
} from './MediaPreviewPanes'
import type { Selection } from './media-tab.types'

interface MediaTabSelectionPreviewProps {
  selection: NonNullable<Selection>
  campaignId: string
  onClose?: () => void
}

export function MediaTabSelectionPreview({
  selection,
  campaignId,
  onClose,
}: MediaTabSelectionPreviewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {onClose ? (
        <div className="px-spacing-3 pt-spacing-2 flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-glass btn-icon-glass-sm"
            aria-label="Close preview"
            title="Close"
          >
            <X className="icon-sm" />
          </button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {selection.type === 'document' && (
          <DocumentPreview doc={selection.doc} campaignId={campaignId} />
        )}
        {selection.type === 'image' && (
          <ImagePreview asset={selection.asset} campaignId={campaignId} />
        )}
        {selection.type === 'video' && (
          <VideoPreview asset={selection.asset} campaignId={campaignId} />
        )}
        {selection.type === 'audio' && (
          <AudioPreview asset={selection.asset} campaignId={campaignId} />
        )}
        {selection.type === 'file' && (
          <FilePreview asset={selection.asset} campaignId={campaignId} />
        )}
        {selection.type === 'deliverable' && (
          <DeliverablePreview deliverable={selection.deliverable} campaignId={campaignId} />
        )}
      </div>
    </div>
  )
}
