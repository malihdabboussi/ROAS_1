'use client'

import type { Ref } from 'react'
import { createPortal } from 'react-dom'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import { ContextBreakdownPopover } from './ContextBreakdownPopover'

export interface ChatInputContextPopoverPosition {
  left: number
  bottom: number
  width: number
}

interface ChatInputContextPopoverPortalProps {
  open: boolean
  panelRef: Ref<HTMLDivElement>
  position: ChatInputContextPopoverPosition | null
  portalTarget?: HTMLElement | null
  breakdown: ContextBreakdown
}

export function ChatInputContextPopoverPortal({
  open,
  panelRef,
  position,
  portalTarget,
  breakdown,
}: ChatInputContextPopoverPortalProps) {
  if (!open || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      className="z-dropdown fixed"
      style={{
        left: position.left,
        bottom: position.bottom,
        width: position.width,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ContextBreakdownPopover
        breakdown={breakdown}
        fallbackInputTokens={breakdown.totalTokens}
        fallbackContextWindow={breakdown.contextWindow}
      />
    </div>,
    portalTarget ?? document.body,
  )
}
