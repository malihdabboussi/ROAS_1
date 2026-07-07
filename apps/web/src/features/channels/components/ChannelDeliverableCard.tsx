'use client'

import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  fetchAvatar,
  fetchBlogPostById,
  fetchDocument,
  fetchFunnelWithPages,
  fetchOffer,
  fetchPresentation,
  fetchSequence,
  fetchSocialPost,
} from '@/lib/artifacts'
import type { Deliverable } from '../lib/channel-deliverables'
import {
  buildAvatarTextPreview,
  buildOfferTextPreview,
  buildSequenceTextPreview,
  buildSocialMiniPreviewCode,
} from '../lib/channel-deliverable-preview-builders'

function ArtifactThumbnail({ item }: { item: Deliverable }) {
  const [html, setHtml] = useState<{ code: string; css?: string } | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(item.label || null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)

  const entityId = item.artifactId ?? ''
  const aType = item.artifactType ?? ''

  useEffect(() => {
    if (!entityId) return
    let cancelled = false

    if (aType === 'presentation') {
      fetchPresentation(entityId)
        .then((row) => {
          if (cancelled || !row?.generated_html) return
          setHtml({ code: row.generated_html })
        })
        .catch(() => {})
    } else if (aType === 'funnel') {
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
          if (first?.generated_html)
            setHtml({ code: first.generated_html, css: first.generated_css ?? undefined })
        })
        .catch(() => {})
    } else if (aType === 'offer') {
      fetchOffer(entityId)
        .then((row) => {
          if (cancelled || !row) return
          setTextPreview(buildOfferTextPreview(row))
        })
        .catch(() => {})
    } else if (aType === 'avatar') {
      fetchAvatar(entityId)
        .then((data) => {
          if (cancelled || !data) return
          const summary = buildAvatarTextPreview(data)
          if (summary) setTextPreview(summary)
          else {
            const img = (data as unknown as Record<string, unknown>).image_url as string | undefined
            if (img) setImgPreview(img)
          }
        })
        .catch(() => {})
    } else if (aType === 'sequence') {
      fetchSequence(entityId)
        .then((seq) => {
          if (cancelled || !seq) return
          setTextPreview(buildSequenceTextPreview(seq))
        })
        .catch(() => {})
    } else if (aType === 'social-post') {
      fetchSocialPost(entityId)
        .then((post) => {
          if (cancelled || !post) return
          const tsx = post.generated_tsx?.trim() || post.carousel_slides?.[0]?.tsx?.trim() || null
          if (tsx) setHtml({ code: buildSocialMiniPreviewCode(tsx) })
          else {
            const img =
              post.image_url?.trim() || post.carousel_slides?.[0]?.image_url?.trim() || null
            if (img) setImgPreview(img)
            else if (post.caption) setTextPreview(post.caption.slice(0, 200))
          }
        })
        .catch(() => {})
    } else if (aType === 'blog-post') {
      fetchBlogPostById(entityId)
        .then((row) => {
          if (cancelled || !row) return
          const d = row as { title?: string; excerpt?: string }
          setTextPreview((d.excerpt ?? d.title ?? '').slice(0, 200))
        })
        .catch(() => {})
    } else if (aType === 'document') {
      fetchDocument(entityId)
        .then((doc) => {
          if (cancelled || !doc) return
          const fileUrl = doc.content?.file_url
          if (typeof fileUrl === 'string' && fileUrl) setImgPreview(fileUrl)
          else {
            const text = doc.content?.text
            if (typeof text === 'string' && text) setTextPreview(text.slice(0, 800))
            else if (doc.title) setTextPreview(doc.title)
          }
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [entityId, aType])

  if (html) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <TsxMiniIframe code={html.code} css={html.css} title={item.label} />
      </div>
    )
  }

  if (imgPreview) {
    return (
      <img
        src={imgPreview}
        alt={item.label}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (textPreview) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="h-full overflow-y-auto px-3 pb-6 pt-3 text-left"
          style={{ scrollbarWidth: 'none' }}
        >
          <MarkdownRenderer className="body-4 text-muted-foreground max-w-none whitespace-pre-line leading-relaxed">
            {textPreview}
          </MarkdownRenderer>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-muted))' }}
        />
      </div>
    )
  }

  return null
}

export function DeliverableCard({ item, onClick }: { item: Deliverable; onClick: () => void }) {
  const hasEntityPreview = !!item.artifactId && !!item.artifactType

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:bg-hover-subtle group flex flex-col overflow-hidden rounded-xl border text-left transition-colors"
    >
      <div className="bg-muted relative aspect-video overflow-hidden">
        {item.type === 'image' && item.url ? (
          <img
            src={item.url}
            alt={item.label}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : item.type === 'video' && item.url ? (
          <video src={item.url} muted preload="metadata" className="h-full w-full object-cover" />
        ) : hasEntityPreview ? (
          <ArtifactThumbnail item={item} />
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        {item.agentAvatarUrl ? (
          <img
            src={item.agentAvatarUrl}
            alt={item.agentKey ?? ''}
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : item.agentKey ? (
          <span className="bg-muted text-muted-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
            <Bot className="h-2.5 w-2.5" />
          </span>
        ) : null}
        <span className="body-4 text-foreground min-w-0 flex-1 truncate font-medium">
          {item.label}
        </span>
        <span className="typo-caption text-muted-foreground shrink-0">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </button>
  )
}
