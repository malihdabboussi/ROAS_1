'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { DocxThumbnail } from '@/components/deliverables/DocxThumbnail'
import {
  isDocxDeliverable,
  isPdfDeliverable,
} from '@/components/deliverables/deliverable-docx.utils'
import {
  buildAvatarTextPreview,
  buildOfferTextPreview,
  buildSequenceTextPreview,
  buildSocialMiniPreviewCode,
  excerpt,
  stripHtml,
} from '@/components/deliverables/deliverables-carousel-preview'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  fetchAvatar,
  fetchBlogPostById,
  fetchDocument,
  fetchEmailArtifact,
  fetchFunnelWithPages,
  fetchOffer,
  fetchPresentation,
  fetchSequence,
  fetchSocialPost,
} from '@/lib/artifacts/artifact-preview-api'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'
import { markdownToHtml } from '@/lib/content/markdown-to-html'
import { DELIVERABLE_ICONS } from '@/lib/missions'
import type { MissionDeliverable } from '@/lib/missions'
import { fetchSpaceItemById } from '@/lib/spaces/spaces-api'

export function EntityThumbnail({ deliverable }: { deliverable: MissionDeliverable }) {
  const Icon = DELIVERABLE_ICONS[deliverable.type] || FileText
  const entityId = deliverable.entity_id!
  const coverThumb =
    typeof deliverable.metadata?.thumbnail === 'string' ? deliverable.metadata.thumbnail : null
  const docBodyPreview =
    deliverable.type === 'doc' && deliverable.content?.trim()
      ? excerpt(normalizeDeliverableContent(deliverable.content), 2800)
      : null
  const [html, setHtml] = useState<{ code: string; css?: string } | null>(null)
  const [rawHtml, setRawHtml] = useState<string | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [avatarImage, setAvatarImage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const t = deliverable.type
    if (t === 'presentation') {
      fetchPresentation(entityId)
        .then((row) => {
          if (cancelled || !row?.generated_html) return
          setHtml({ code: row.generated_html })
        })
        .catch(() => {})
    } else if (t === 'funnel' || t === 'website') {
      fetchFunnelWithPages(entityId)
        .then((funnel) => {
          if (cancelled) return
          const pages = Array.isArray(funnel.pages)
            ? (funnel.pages as Array<{
                generated_html: string | null
                generated_css: string | null
                order_index?: number
              }>)
            : []
          const sorted = pages.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          const first = sorted[0]
          if (first?.generated_html) {
            setHtml({ code: first.generated_html, css: first.generated_css ?? undefined })
          }
        })
        .catch(() => {})
    } else if (t === 'offer') {
      fetchOffer(entityId)
        .then((row) => {
          if (cancelled || !row) return
          setTextPreview(buildOfferTextPreview(row))
        })
        .catch(() => {})
    } else if (t === 'avatar') {
      fetchAvatar(entityId)
        .then((data) => {
          if (cancelled || !data) return
          const summary = buildAvatarTextPreview(data)
          if (summary) {
            setTextPreview(summary)
          } else {
            const img = (data as unknown as Record<string, unknown>).image_url as string | undefined
            if (img) setAvatarImage(img)
          }
        })
        .catch(() => {})
    } else if (t === 'sequence') {
      fetchSequence(entityId)
        .then((seq) => {
          if (cancelled || !seq) return
          setTextPreview(buildSequenceTextPreview(seq))
        })
        .catch(() => {})
    } else if (t === 'blog_post') {
      fetchBlogPostById(entityId)
        .then((row) => {
          if (cancelled || !row) return
          const d = row as { title?: string; excerpt?: string }
          setTextPreview((d.excerpt ?? d.title ?? '').slice(0, 200))
        })
        .catch(() => {})
    } else if (t === 'social_post') {
      fetchSocialPost(entityId)
        .then((post) => {
          if (cancelled || !post) return
          const tsx = post.generated_tsx?.trim() || post.carousel_slides?.[0]?.tsx?.trim() || null
          if (tsx) {
            setHtml({ code: buildSocialMiniPreviewCode(tsx) })
          } else {
            const img =
              post.image_url?.trim() || post.carousel_slides?.[0]?.image_url?.trim() || null
            if (img) setAvatarImage(img)
            else if (post.caption) setTextPreview(post.caption.slice(0, 200))
          }
        })
        .catch(() => {})
    } else if (t === 'email') {
      fetchEmailArtifact(entityId)
        .then((mail) => {
          if (cancelled) return
          const subj = mail.subject?.trim() ?? ''
          const plainBody = stripHtml(mail.body ?? '')
          const combined = [subj && `Subject: ${subj}`, plainBody].filter(Boolean).join('\n\n')
          setTextPreview(combined.length > 0 ? excerpt(combined, 2800) : null)
        })
        .catch(() => {})
    } else if (t === 'doc') {
      if (deliverable.entity_table === 'space_items') {
        fetchSpaceItemById(entityId, deliverable.title)
          .then((item) => {
            if (cancelled) return
            const custom = (item.custom_data ?? {}) as Record<string, unknown>
            const visual = custom._doc_visual_html
            if (typeof visual === 'string' && visual.trim()) {
              setRawHtml(visual)
              return
            }
            const raw = item.doc_body ?? item.notes ?? ''
            if (!raw) return
            setRawHtml(/<[a-z][\s\S]*>/i.test(raw) ? raw : (markdownToHtml(raw) ?? raw))
          })
          .catch(() => {})
      } else {
        fetchDocument(entityId)
          .then((doc) => {
            if (cancelled) return
            const markdown = extractMarkdownFromDocumentContent(doc.content)
            if (markdown) setRawHtml(markdownToHtml(markdown) ?? markdown)
          })
          .catch(() => {})
      }
    }
    return () => {
      cancelled = true
    }
  }, [entityId, deliverable.type, deliverable.entity_table, deliverable.title])

  if (html) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <TsxMiniIframe code={html.code} css={html.css} title={deliverable.title} />
      </div>
    )
  }

  if (rawHtml) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div className="deliverable-thumbnail-scale-25 absolute left-0 top-0 origin-top-left">
          <HtmlMiniIframe html={rawHtml} title={deliverable.title} />
        </div>
      </div>
    )
  }

  if (deliverable.type === 'doc' && coverThumb) {
    return (
      <img
        src={coverThumb}
        alt={deliverable.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (avatarImage) {
    return (
      <img
        src={avatarImage}
        alt={deliverable.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (textPreview || docBodyPreview) {
    const previewText = textPreview ?? docBodyPreview!
    const emphasizedEntityText =
      deliverable.type === 'offer' ||
      deliverable.type === 'avatar' ||
      deliverable.type === 'sequence' ||
      deliverable.type === 'email'
    const textScaleClass = emphasizedEntityText
      ? 'deliverable-thumbnail-text-scale-30'
      : 'deliverable-thumbnail-text-scale-25'
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`${textScaleClass} absolute left-0 top-0 origin-top-left p-spacing-4 text-left`}
        >
          <MarkdownRenderer
            className={`${emphasizedEntityText ? 'body-2' : 'body-3'} max-w-none text-left leading-relaxed`}
          >
            {previewText}
          </MarkdownRenderer>
        </div>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 absolute inset-0 flex flex-col items-center justify-center">
      <Icon className="h-spacing-8 aspect-square text-muted-foreground" />
    </div>
  )
}

export function FileThumbnail({ deliverable }: { deliverable: MissionDeliverable }) {
  const hasTextContent = !!deliverable.content?.trim()
  const isEntityType = !!deliverable.entity_id
  const thumbFromMeta =
    typeof deliverable.metadata?.thumbnail === 'string' ? deliverable.metadata.thumbnail : null

  if (isEntityType) return <EntityThumbnail deliverable={deliverable} />

  if (deliverable.type === 'image' && deliverable.file_url) {
    return (
      <img
        src={deliverable.file_url}
        alt={deliverable.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (thumbFromMeta) {
    return (
      <img
        src={thumbFromMeta}
        alt={deliverable.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (deliverable.type === 'video' && deliverable.file_url) {
    return (
      <video
        src={deliverable.file_url}
        muted
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (isDocxDeliverable(deliverable) && deliverable.file_url) {
    return <DocxThumbnail fileUrl={deliverable.file_url} title={deliverable.title} />
  }

  if (isPdfDeliverable(deliverable) && deliverable.file_url) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src={`${deliverable.file_url}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&page=1&view=FitH`}
          title={deliverable.title}
          tabIndex={-1}
          className="deliverable-thumbnail-scale-1667 pointer-events-none absolute left-0 top-0 origin-top-left border-none bg-background"
        />
      </div>
    )
  }

  if (hasTextContent) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="deliverable-thumbnail-text-scale-25 absolute left-0 top-0 origin-top-left p-spacing-4 text-left">
          <MarkdownRenderer className="body-3 max-w-none text-left leading-relaxed">
            {normalizeDeliverableContent(deliverable.content!)}
          </MarkdownRenderer>
        </div>
      </div>
    )
  }

  return null
}
