'use client'

import { X } from 'lucide-react'
import { PASTED_TEXT_PREVIEW_CHARS } from './pasted-text.constants'
import type { PastedTextBlock } from './pasted-text.types'

function previewText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= PASTED_TEXT_PREVIEW_CHARS) return normalized
  return `${normalized.slice(0, PASTED_TEXT_PREVIEW_CHARS)}…`
}

export function PastedTextCard({
  block,
  onClick,
  onRemove,
}: {
  block: PastedTextBlock
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <div className="group relative h-[72px] w-[72px] shrink-0">
      <button
        type="button"
        onClick={onClick}
        className="border-border bg-card hover:bg-secondary/40 flex h-full w-full flex-col overflow-hidden rounded-lg border text-left transition-colors"
        aria-label="View pasted text"
      >
        <span className="body-4 text-muted-foreground line-clamp-3 flex-1 overflow-hidden px-1.5 pt-1.5 leading-tight">
          {previewText(block.text)}
        </span>
        <span className="bg-secondary text-muted-foreground mx-1 mb-1 mt-0.5 self-start rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide">
          Pasted
        </span>
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="bg-card border-border text-muted-foreground hover:text-foreground absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove pasted text"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </div>
  )
}
