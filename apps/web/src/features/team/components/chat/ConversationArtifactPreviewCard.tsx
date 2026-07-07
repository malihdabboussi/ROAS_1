'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  FileText,
  Gift,
  Image as ImageIcon,
  LayoutTemplate,
  Mail,
  User,
} from 'lucide-react'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import {
  getFunnelIdFromConversationDocument,
  getOfferIdFromConversationDocument,
} from '@/lib/artifacts/conversation-document-to-pending-artifact'
import { fetchOffer, fetchFunnelWithPages } from '@/lib/artifacts/artifact-preview-api'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import { buildConversationArtifactPreviewMeta } from '@/features/team/lib/conversation-artifact-preview.utils'
import { buildOfferStepPreviews } from '@/lib/artifacts/offer-step-preview'

function ArtifactDocIcon({ documentType }: { documentType: string }) {
  const cls = 'icon-md text-muted-foreground shrink-0'
  switch (documentType) {
    case 'offer':
      return <Briefcase className={cls} aria-hidden />
    case 'funnel':
      return <LayoutTemplate className={cls} aria-hidden />
    case 'presentation':
      return <Gift className={cls} aria-hidden />
    case 'sequence':
    case 'email':
      return <Mail className={cls} aria-hidden />
    case 'avatar':
      return <User className={cls} aria-hidden />
    case 'image_upload':
      return <ImageIcon className={cls} aria-hidden />
    case 'pdf':
      return <FileText className={cls} aria-hidden />
    default:
      return <FileText className={cls} aria-hidden />
  }
}

export interface ConversationArtifactPreviewCardProps {
  doc: ConversationDocument
  /** e.g. chat title or agent name for context row */
  contextLine?: string | null
  onOpen?: () => void
  className?: string
}

export function ConversationArtifactPreviewCard({
  doc,
  contextLine,
  onOpen,
  className = '',
}: ConversationArtifactPreviewCardProps) {
  const meta = buildConversationArtifactPreviewMeta(doc)
  const interactive = typeof onOpen === 'function'

  const offerId = useMemo(
    () => (doc.document_type === 'offer' ? getOfferIdFromConversationDocument(doc) : null),
    [doc],
  )

  const funnelId = useMemo(
    () => (doc.document_type === 'funnel' ? getFunnelIdFromConversationDocument(doc) : null),
    [doc],
  )

  const [offerStepRows, setOfferStepRows] = useState<Array<{
    label: string
    preview: string
  }> | null>(null)
  const [offerFetchLoading, setOfferFetchLoading] = useState(false)

  const [funnelPreview, setFunnelPreview] = useState<{ code: string; css?: string } | null>(null)
  const [funnelFetchLoading, setFunnelFetchLoading] = useState(false)

  useEffect(() => {
    if (!offerId) {
      setOfferStepRows(null)
      setOfferFetchLoading(false)
      return
    }
    let cancelled = false
    setOfferFetchLoading(true)
    setOfferStepRows(null)
    fetchOffer(offerId)
      .then((row) => {
        if (cancelled || !row) return
        setOfferStepRows(buildOfferStepPreviews(row))
      })
      .finally(() => {
        if (!cancelled) setOfferFetchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [offerId])

  useEffect(() => {
    if (!funnelId) {
      setFunnelPreview(null)
      setFunnelFetchLoading(false)
      return
    }
    let cancelled = false
    setFunnelFetchLoading(true)
    setFunnelPreview(null)
    fetchFunnelWithPages(funnelId)
      .then((funnel) => {
        if (cancelled) return
        const pages = Array.isArray(funnel.pages)
          ? (funnel.pages as Array<{
              id: string
              generated_html: string | null
              generated_css: string | null
              order_index?: unknown
            }>)
          : []
        const sorted = pages.slice().sort((a, b) => {
          const aOrder = Number(a.order_index ?? 0)
          const bOrder = Number(b.order_index ?? 0)
          return aOrder - bOrder
        })
        const first = sorted[0]
        if (first?.generated_html) {
          setFunnelPreview({
            code: first.generated_html,
            css: first.generated_css ?? undefined,
          })
        } else {
          setFunnelPreview(null)
        }
      })
      .catch(() => {
        if (!cancelled) setFunnelPreview(null)
      })
      .finally(() => {
        if (!cancelled) setFunnelFetchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId])

  const funnelShowsMiniPreview = Boolean(funnelId && funnelPreview)
  const leftVisualOnly = Boolean(meta.thumbUrl || meta.pdfEmbedUrl)
  const leftWClass = leftVisualOnly ? 'w-spacing-24' : 'w-spacing-36'

  const leftDisplaysExcerpt =
    Boolean(meta.excerpt) &&
    !meta.thumbUrl &&
    !meta.pdfEmbedUrl &&
    !(doc.document_type === 'offer' && offerId && offerFetchLoading) &&
    !(offerStepRows !== null && offerStepRows.length > 0) &&
    !(doc.document_type === 'funnel' && funnelId && (funnelFetchLoading || funnelShowsMiniPreview))

  const showRightExcerpt =
    Boolean(meta.excerpt) &&
    !leftDisplaysExcerpt &&
    !(offerStepRows && offerStepRows.length > 0) &&
    !(doc.document_type === 'funnel' && funnelShowsMiniPreview)

  const previewHClass = doc.document_type === 'funnel' ? 'h-spacing-32' : 'h-spacing-24'

  const leftPane = (() => {
    if (meta.thumbUrl) {
      return (
        <img
          src={meta.thumbUrl}
          alt=""
          className={`block ${previewHClass} w-full shrink-0 object-cover`}
        />
      )
    }
    if (meta.pdfEmbedUrl) {
      return (
        <iframe
          title={meta.title}
          src={meta.pdfEmbedUrl}
          className={`bg-muted pointer-events-none block ${previewHClass} w-full min-w-0 shrink-0 border-0`}
        />
      )
    }
    if (doc.document_type === 'funnel' && funnelId) {
      if (funnelFetchLoading) {
        return (
          <div
            className={`flex ${previewHClass} px-spacing-1 w-full flex-col items-center justify-center`}
          >
            <LayoutTemplate className="icon-lg text-muted-foreground animate-pulse" aria-hidden />
          </div>
        )
      }
      if (funnelPreview) {
        return (
          <div className={`relative ${previewHClass} bg-muted w-full shrink-0 overflow-hidden`}>
            <TsxMiniIframe code={funnelPreview.code} css={funnelPreview.css} title={meta.title} />
          </div>
        )
      }
    }
    if (doc.document_type === 'offer' && offerId) {
      if (offerFetchLoading) {
        return (
          <div
            className={`flex ${previewHClass} px-spacing-1 w-full flex-col items-center justify-center`}
          >
            <Briefcase className="icon-lg text-muted-foreground animate-pulse" aria-hidden />
          </div>
        )
      }
      if (offerStepRows && offerStepRows.length > 0) {
        return (
          <div
            className={`scrollbar-hide flex ${previewHClass} gap-spacing-1 px-spacing-2 pt-spacing-1 shrink-0 flex-col overflow-y-auto`}
          >
            {offerStepRows.map((s) => (
              <div key={s.label}>
                <p className="typo-caption text-foreground font-semibold uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="body-4 text-muted-foreground mt-spacing-1 line-clamp-2 whitespace-pre-line">
                  {s.preview}
                </p>
              </div>
            ))}
          </div>
        )
      }
    }
    if (meta.excerpt) {
      return (
        <div
          className={`scrollbar-hide flex ${previewHClass} px-spacing-2 pt-spacing-1 shrink-0 flex-col overflow-y-auto`}
        >
          <p className="body-4 text-muted-foreground line-clamp-3 whitespace-pre-line">
            {meta.excerpt}
          </p>
        </div>
      )
    }
    return (
      <div
        className={`flex ${previewHClass} gap-spacing-1 px-spacing-1 w-full flex-col items-center justify-center`}
      >
        <ArtifactDocIcon documentType={doc.document_type} />
        <span className="typo-caption text-muted-foreground text-center uppercase">Preview</span>
      </div>
    )
  })()

  const inner = (
    <>
      <div
        className={`border-border bg-muted flex shrink-0 flex-col self-stretch overflow-hidden border-r ${leftWClass}`}
      >
        <div className={`relative flex shrink-0 flex-col overflow-hidden ${previewHClass}`}>
          {leftPane}
        </div>
      </div>

      <div className="min-w-0 flex-1 max-md:px-3 max-md:py-2 md:p-spacing-3">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <span className="body-3 text-foreground min-w-0 font-medium">
            <span className="line-clamp-2">{meta.title}</span>
          </span>
          <span
            className={`${meta.badgeClass} body-4 px-spacing-2 py-spacing-1 shrink-0 font-medium uppercase`}
          >
            {meta.typeLabel}
          </span>
        </div>
        {showRightExcerpt ? (
          <p className="body-4 text-muted-foreground mt-spacing-1 line-clamp-2">{meta.excerpt}</p>
        ) : null}
        {contextLine ? (
          <p className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-1">
            {contextLine}
          </p>
        ) : null}
      </div>
    </>
  )

  const shellClass =
    `artifact-inline-chat-shell flex w-full min-h-0 min-w-0 items-stretch overflow-hidden p-0 text-left transition-colors md:surface-card md:my-spacing-0 md:rounded-spacing-3 md:border md:border-border md:hover:bg-hover-subtle ${className}`.trim()

  if (interactive) {
    return (
      <button type="button" onClick={onOpen} className={shellClass}>
        {inner}
      </button>
    )
  }

  return <div className={shellClass}>{inner}</div>
}
