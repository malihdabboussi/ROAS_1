'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const PEEK_GAP = 8
const PEEK_CARD_W = 280

type PeekPayload = {
  top: number
  left: number
}

function computeSidebarPeekLeft(anchor: DOMRect): number {
  if (typeof window === 'undefined') {
    return anchor.right + PEEK_GAP
  }
  const margin = 16
  const preferRight = anchor.right + PEEK_GAP
  if (preferRight + PEEK_CARD_W <= window.innerWidth - margin) {
    return preferRight
  }
  const alternateLeft = anchor.left - PEEK_CARD_W - PEEK_GAP
  if (alternateLeft >= margin) {
    return alternateLeft
  }
  return margin
}

function AccordionTitlePeekPortal({
  peek,
  title,
  body,
  onPeekEnter,
  onPeekLeave,
}: {
  peek: PeekPayload | null
  title: string
  body: string
  onPeekEnter: () => void
  onPeekLeave: () => void
}) {
  if (typeof document === 'undefined' || !peek) {
    return null
  }

  return createPortal(
    <div
      className="z-dropdown surface-card border-border rounded-spacing-2 body-4 text-foreground p-spacing-3 pointer-events-auto w-[min(280px,calc(100vw-48px))] border shadow-xl"
      style={{
        position: 'fixed',
        left: peek.left,
        top: peek.top,
        transform: 'translateY(-50%)',
      }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
    >
      <p className="body-3 text-foreground font-semibold">{title}</p>
      <p className="body-4 text-muted-foreground mt-spacing-2">{body}</p>
    </div>,
    document.body,
  )
}

/** Collapsible sidebar section shared by the research sidebars (social + ads). */
export function AccordionSection({
  title,
  titlePeekBody,
  titleActive = false,
  onTitleClick,
  open,
  onToggle,
  action,
  children,
}: {
  title: string
  /** When set, shown in a hover card to the right of the section title. */
  titlePeekBody?: string
  /** Highlights the section title when it controls the current view. */
  titleActive?: boolean
  /** When set, the title selects the whole section; the chevron remains collapse-only. */
  onTitleClick?: () => void
  open: boolean
  onToggle: () => void
  action: ReactNode
  children: ReactNode
}) {
  const [peek, setPeek] = useState<PeekPayload | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const cancelHide = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const scheduleHide = () => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => {
      setPeek(null)
      hideTimerRef.current = null
    }, 280)
  }

  useEffect(() => () => cancelHide(), [])

  const showPeek = (e: MouseEvent<HTMLElement>) => {
    if (!titlePeekBody) return
    cancelHide()
    const r = e.currentTarget.getBoundingClientRect()
    setPeek({
      top: r.top + r.height / 2,
      left: computeSidebarPeekLeft(r),
    })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <AccordionTitlePeekPortal
        peek={titlePeekBody ? peek : null}
        title={title}
        body={titlePeekBody ?? ''}
        onPeekEnter={cancelHide}
        onPeekLeave={scheduleHide}
      />
      <div className="flex shrink-0 items-center gap-1 px-2 py-0.5">
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
          aria-expanded={open}
          className="rounded-spacing-1 p-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground transition-colors"
        >
          <ChevronRight
            className={cn('icon-xs transition-transform duration-150', open && 'rotate-90')}
          />
        </button>
        <button
          type="button"
          onClick={onTitleClick ?? onToggle}
          onMouseEnter={titlePeekBody ? showPeek : undefined}
          onMouseLeave={titlePeekBody ? scheduleHide : undefined}
          aria-pressed={onTitleClick ? titleActive : undefined}
          className={cn(
            'rounded-spacing-1 px-spacing-1 py-spacing-1 body-3 flex min-w-0 flex-1 items-center text-left font-semibold transition-colors',
            titleActive
              ? 'bg-hover-subtle text-foreground'
              : 'text-foreground hover:bg-hover-subtle',
          )}
        >
          <span className="truncate">{title}</span>
        </button>
      </div>
      {open ? (
        <div className="gap-spacing-1 p-spacing-2 flex min-h-0 flex-col pb-0">
          {action}
          {children}
        </div>
      ) : null}
    </div>
  )
}
