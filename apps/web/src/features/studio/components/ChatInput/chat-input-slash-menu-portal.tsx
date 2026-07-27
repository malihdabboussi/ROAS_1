'use client'

import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { SlashItem } from './chat-input-slash-menu'
import { SlashCommandMenuView, type SlashMenuLayout } from './chat-input-slash-menu-view'

interface ChatInputSlashMenuPortalProps {
  open: boolean
  floatingRef: (node: HTMLDivElement | null) => void
  floatingStyles: CSSProperties
  portalTarget?: HTMLElement | null
  layout: SlashMenuLayout
  slashItemsCount: number
  slashHighlight: number
  onSelect: (item: SlashItem) => void
  onHighlight: (index: number) => void
  onShowMorePlaybooks: () => void
  onShowMoreSkills: () => void
  onShowMoreWorkflows: () => void
}

export function ChatInputSlashMenuPortal({
  open,
  floatingRef,
  floatingStyles,
  portalTarget,
  layout,
  slashItemsCount,
  slashHighlight,
  onSelect,
  onHighlight,
  onShowMorePlaybooks,
  onShowMoreSkills,
  onShowMoreWorkflows,
}: ChatInputSlashMenuPortalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={floatingRef}
      className="dropdown-menu-solid z-dropdown max-h-[min(420px,calc(100vh-2rem))] w-80 min-w-72 overflow-y-auto"
      style={floatingStyles}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <SlashCommandMenuView
        layout={layout}
        slashItemsCount={slashItemsCount}
        slashHighlight={slashHighlight}
        onSelect={onSelect}
        onHighlight={onHighlight}
        onShowMorePlaybooks={onShowMorePlaybooks}
        onShowMoreSkills={onShowMoreSkills}
        onShowMoreWorkflows={onShowMoreWorkflows}
      />
    </div>,
    portalTarget ?? document.body,
  )
}
