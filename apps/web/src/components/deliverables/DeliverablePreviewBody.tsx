'use client'

import type { RefObject } from 'react'
import { isDocxDeliverable } from '@/components/deliverables/deliverable-docx.utils'
import type {
  DeliverableEntityPreviewRenderer,
  ViewMode,
} from '@/components/deliverables/deliverable-preview-modal.types'
import { DeliverableA4PagedPreview } from '@/components/deliverables/DeliverableA4PagedPreview'
import {
  DeliverableHtmlPreview,
  looksLikeDeliverableHtml,
  resolveDeliverablePreviewHtml,
} from '@/components/deliverables/DeliverableHtmlPreview'
import { DocxFileDeliverablePreview } from '@/components/deliverables/DocxFileDeliverablePreview'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import {
  isSpaceItemDocDeliverable,
  resolveSpaceDocDeliverableContext,
} from '@/components/deliverables/space-doc-deliverable'
import { SpaceDocDeliverablePreview } from '@/components/deliverables/SpaceDocDeliverablePreview'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'
import type { MissionDeliverable } from '@/lib/missions'

export function DeliverablePreviewBody({
  contentRef,
  deliverable,
  entityContentLoading,
  isEntityType,
  isTextContent,
  effectiveContent,
  viewMode,
  fallbackSpaceId,
  spaceDocActionTarget,
  renderEntityPreview,
}: {
  contentRef: RefObject<HTMLDivElement | null>
  deliverable: MissionDeliverable
  /** True while fetching entity row for markdown / entity toolbar (doc, offer, …). */
  entityContentLoading: boolean
  isEntityType: boolean
  isTextContent: boolean
  effectiveContent: string | null
  viewMode: ViewMode
  /** When the deliverable is a Space doc, used if metadata lacks spaceId. */
  fallbackSpaceId?: string | null
  spaceDocActionTarget?: HTMLElement | null
  renderEntityPreview: DeliverableEntityPreviewRenderer
}) {
  const rawText = deliverable.content || effectiveContent
  const textToRender =
    extractMarkdownFromDocumentContent(rawText) ||
    (typeof rawText === 'string' && rawText.trim() ? rawText : null)
  const isDocxFile = isDocxDeliverable(deliverable)
  const spaceDocCtx = isSpaceItemDocDeliverable(deliverable)
    ? resolveSpaceDocDeliverableContext(deliverable, fallbackSpaceId)
    : null
  const awaitingEntityHydration =
    entityContentLoading &&
    !deliverable.file_url &&
    !(isEntityType && deliverable.entity_id && deliverable.type !== 'doc') &&
    !spaceDocCtx

  if (awaitingEntityHydration && !textToRender) {
    return (
      <div className="gap-spacing-4 py-spacing-16 flex min-h-0 flex-1 flex-col items-center justify-center">
        <VibeyChatOrb className="h-14 w-14" state="thinking" />
      </div>
    )
  }

  const normalizedText = textToRender ? normalizeDeliverableContent(textToRender) : null
  const textIsHtml = !!normalizedText && looksLikeDeliverableHtml(normalizedText)
  const showAsText = !!(isTextContent || (!deliverable.file_url && textToRender))
  const a4 = showAsText && viewMode === 'a4'
  const usePagedA4 =
    a4 &&
    !!normalizedText &&
    !textIsHtml &&
    !(isEntityType && deliverable.entity_id && deliverable.type !== 'doc') &&
    !deliverable.file_url

  const innerContent = spaceDocCtx ? (
    <SpaceDocDeliverablePreview
      spaceId={spaceDocCtx.spaceId}
      itemId={spaceDocCtx.itemId}
      title={deliverable.title}
      googleActionTarget={spaceDocActionTarget}
    />
  ) : isEntityType && deliverable.entity_id && deliverable.type !== 'doc' ? (
    renderEntityPreview({
      deliverableType: deliverable.type,
      entityId: deliverable.entity_id,
    })
  ) : deliverable.file_url ? (
    deliverable.type === 'image' ? (
      <div className="flex justify-center">
        <img
          src={deliverable.file_url}
          alt={deliverable.title}
          className="rounded-spacing-2 max-h-[70vh] max-w-full object-contain"
        />
      </div>
    ) : deliverable.type === 'video' ? (
      <div className="flex justify-center">
        <video
          src={deliverable.file_url}
          controls
          className="rounded-spacing-2 max-h-[70vh] max-w-full"
        />
      </div>
    ) : deliverable.type === 'audio' ? (
      <div className="flex justify-center">
        <audio src={deliverable.file_url} controls className="w-full max-w-full" />
      </div>
    ) : isDocxFile ? (
      <DocxFileDeliverablePreview fileUrl={deliverable.file_url} />
    ) : (
      <div className="flex min-h-[min(70vh,40rem)] flex-1 flex-col">
        <iframe
          src={`${deliverable.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="border-border rounded-spacing-2 min-h-0 w-full flex-1 border"
          title={deliverable.title}
        />
      </div>
    )
  ) : normalizedText ? (
    textIsHtml ? (
      <DeliverableHtmlPreview html={resolveDeliverablePreviewHtml(normalizedText)} />
    ) : (
      <MarkdownRenderer className="body-2 max-w-none leading-relaxed">
        {normalizedText}
      </MarkdownRenderer>
    )
  ) : (
    <div className="body-2 text-muted-foreground">No content to display</div>
  )

  if (usePagedA4) {
    return <DeliverableA4PagedPreview ref={contentRef} markdown={normalizedText as string} />
  }

  if (a4) {
    return (
      <div ref={contentRef} className="flex min-h-0 w-full flex-1 flex-col items-stretch">
        {innerContent}
      </div>
    )
  }

  return (
    <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
      {innerContent}
    </div>
  )
}
