'use client'

import { useState } from 'react'
import { ArrowUpRight, Copy, Globe, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LinkPreview } from '../../services/spaces.service'

interface LinkPreviewCardProps {
  preview: LinkPreview
  /**
   * When set, clicking the card invokes this handler instead of navigating
   * to the preview URL — used in the task activity to open the same
   * `DeliverablePreviewModal` that the Deliverables & Media carousel uses.
   * The Open hover-button still opens the URL in a new tab.
   */
  onPreview?: () => void
}

function shortHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function FallbackIcon({ provider }: { provider: LinkPreview['provider'] }) {
  return provider === 'drive' ? (
    <Link2 className="h-5 w-5 text-[var(--color-muted-foreground)]" />
  ) : (
    <Globe className="h-5 w-5 text-[var(--color-muted-foreground)]" />
  )
}

export function LinkPreviewCard({ preview, onPreview }: LinkPreviewCardProps) {
  const host = shortHost(preview.url)
  const title = preview.title || host
  const showDesc = preview.description && preview.description !== preview.title
  const [thumbOk, setThumbOk] = useState(true)
  const [iconOk, setIconOk] = useState(true)
  const thumb = thumbOk ? preview.imageUrl : null
  const icon = iconOk ? preview.iconUrl : null

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void navigator.clipboard
      .writeText(preview.url)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Could not copy link'))
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onPreview) return
    e.preventDefault()
    e.stopPropagation()
    onPreview()
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCardClick}
      className="card-glass mt-spacing-2 gap-spacing-3 rounded-spacing-2 p-spacing-2 group relative flex max-w-md items-stretch overflow-hidden border border-[var(--color-border)] transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--color-secondary)]">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setThumbOk(false)}
          />
        ) : icon ? (
          <img
            src={icon}
            alt=""
            className="h-6 w-6 object-contain"
            onError={() => setIconOk(false)}
          />
        ) : (
          <FallbackIcon provider={preview.provider} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="body-3 block min-w-0 truncate font-medium text-[var(--color-foreground)]">
          {title}
        </span>
        {showDesc ? (
          <p className="body-3 mt-0.5 line-clamp-2 text-[var(--color-muted-foreground)]">
            {preview.description}
          </p>
        ) : null}
        <span className="body-4 text-[var(--color-muted-foreground)]/70 mt-0.5 block truncate">
          {preview.siteName || host}
        </span>
      </div>

      {/* Hover actions — slide + fade in from right */}
      <div className="pointer-events-none absolute right-2 top-2 flex translate-x-2 items-center gap-1 opacity-0 transition-[transform,opacity] duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] transition-colors"
          aria-label="Copy link"
          title="Copy link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleOpen}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] transition-colors"
          aria-label="Open in new window"
          title="Open in new window"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </a>
  )
}
