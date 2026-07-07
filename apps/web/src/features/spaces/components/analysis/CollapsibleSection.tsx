'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ClipboardCopy } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function CollapsibleSection({
  id,
  title,
  open,
  onToggle,
  copyLabel,
  copyText,
  onCopy,
  children,
}: {
  id: string
  title: string
  open: boolean
  onToggle: () => void
  copyLabel?: string
  copyText: string | null
  onCopy: (text: string, label: string) => void
  children: ReactNode
}) {
  const canCopy = Boolean(copyText && copyText.length > 0)
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-stretch gap-0.5 px-1 py-0.5">
        <button
          type="button"
          id={`${id}-trigger`}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors',
            'hover:bg-[var(--color-hover-subtle)]',
          )}
        >
          <span className="body-3 font-medium text-[var(--foreground)]">{title}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
        <button
          type="button"
          disabled={!canCopy}
          onClick={(e) => {
            e.stopPropagation()
            if (copyText && copyLabel) onCopy(copyText, copyLabel)
          }}
          className="shrink-0 self-center rounded-lg p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40"
          title="Copy"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
        </button>
      </div>
      {open ? (
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          className="px-3 pb-3 pt-0"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
