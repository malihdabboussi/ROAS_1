import type { CSSProperties, MouseEventHandler, Ref } from 'react'
import { createPortal } from 'react-dom'
import {
  ChatInputAtMentionMenuView,
  type ChatInputAtMentionMenuViewProps,
} from './chat-input-at-mention-menu-view'

interface ChatInputAtMentionMenuPortalProps
  extends Omit<ChatInputAtMentionMenuViewProps, 'style' | 'onMouseDown'> {
  open: boolean
  portalTarget: HTMLElement | null
  floatingRef: Ref<HTMLDivElement>
  floatingStyles: CSSProperties
  composerShellRect: { width: number; left: number } | null
}

export function ChatInputAtMentionMenuPortal({
  open,
  portalTarget,
  floatingRef,
  floatingStyles,
  composerShellRect,
  ...viewProps
}: ChatInputAtMentionMenuPortalProps) {
  if (!open || typeof document === 'undefined') return null

  const panelWidth =
    typeof window !== 'undefined' && composerShellRect && composerShellRect.width > 0
      ? Math.min(
          Math.max(320, composerShellRect.width * 0.85),
          Math.max(320, window.innerWidth - 32),
        )
      : 448

  const atMentionPanelStyle = {
    ...floatingStyles,
    width: panelWidth,
    minWidth: panelWidth,
    maxWidth: panelWidth,
  }

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation()
  }

  return createPortal(
    <ChatInputAtMentionMenuView
      ref={floatingRef}
      style={atMentionPanelStyle}
      onMouseDown={handleMouseDown}
      {...viewProps}
    />,
    portalTarget ?? document.body,
  )
}
