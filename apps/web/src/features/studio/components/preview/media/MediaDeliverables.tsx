'use client'

import { ExternalLink, File, FileText, Image, Video } from 'lucide-react'
import type { CampaignDeliverable } from '../../../services/artifact-preview.service'
import type { Selection } from './media-tab.types'

const DELIVERABLE_TYPE_ICON: Record<string, typeof FileText> = {
  doc: FileText,
  text: FileText,
  pdf: FileText,
  image: Image,
  video: Video,
  file: File,
}

export function DeliverableRow({
  deliverable,
  selection,
  setSelection,
}: {
  deliverable: CampaignDeliverable
  selection: Selection
  setSelection: (s: Selection) => void
}) {
  const Icon = DELIVERABLE_TYPE_ICON[deliverable.type] ?? FileText
  const sourceLabel = deliverable.source === 'chat' ? 'Chat' : 'Mission'
  const isSelected =
    selection?.type === 'deliverable' && selection.deliverable.id === deliverable.id

  return (
    <div
      className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 group flex w-full items-center transition-colors"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/x-vibey-artifact',
          JSON.stringify({ id: deliverable.id, type: 'deliverable', label: deliverable.title }),
        )
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <button
        onClick={() => setSelection({ type: 'deliverable', deliverable })}
        className={`gap-spacing-2 flex min-w-0 flex-1 items-center text-left transition-colors ${isSelected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Icon className="icon-xs shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="body-2 truncate">{deliverable.title}</p>
          <div className="gap-spacing-1 mt-0.5 flex items-center">
            <span className="typo-caption">{deliverable.type}</span>
            <span className="opacity-30">·</span>
            <span className="typo-caption">{sourceLabel}</span>
          </div>
        </div>
      </button>
    </div>
  )
}

export function DeliverablePreview({
  deliverable,
  campaignId: _campaignId,
}: {
  deliverable: CampaignDeliverable
  campaignId: string
}) {
  const sourceLabel = deliverable.source === 'chat' ? 'Chat' : 'Mission'
  const hasContent = !!deliverable.content
  const isImage = deliverable.type === 'image' && deliverable.file_url
  const isVideo = deliverable.type === 'video' && deliverable.file_url
  const isPdf = deliverable.type === 'pdf' && deliverable.file_url

  return (
    <div className="p-spacing-4 flex h-full flex-col overflow-y-auto">
      <div className="mb-spacing-4">
        <h2 className="body-2 text-foreground mb-spacing-1 font-semibold">{deliverable.title}</h2>
        <div className="gap-spacing-2 flex items-center">
          <span className="typo-caption text-muted-foreground">{deliverable.type}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="typo-caption text-muted-foreground">{sourceLabel}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="typo-caption text-muted-foreground">
            {new Date(deliverable.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {isImage && (
        <div className="mb-spacing-4 rounded-spacing-2 overflow-hidden">
          <img
            src={deliverable.file_url!}
            alt={deliverable.title}
            className="w-full object-contain"
          />
        </div>
      )}

      {isVideo && (
        <div className="mb-spacing-4 rounded-spacing-2 overflow-hidden">
          <video src={deliverable.file_url!} controls className="w-full" />
        </div>
      )}

      {isPdf && (
        <iframe
          src={`${deliverable.file_url!}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="border-border mb-spacing-4 rounded-spacing-2 min-h-96 flex-1 border"
          title={deliverable.title}
        />
      )}

      {hasContent && (
        <div className="bg-muted/30 rounded-spacing-2 p-spacing-4">
          <pre className="body-3 text-foreground whitespace-pre-wrap">{deliverable.content}</pre>
        </div>
      )}

      {deliverable.file_url && !isImage && !isVideo && !isPdf && (
        <a
          href={deliverable.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 mt-spacing-2 gap-spacing-2 inline-flex items-center self-start font-medium"
        >
          <ExternalLink className="icon-xs" />
          Open file
        </a>
      )}
    </div>
  )
}
