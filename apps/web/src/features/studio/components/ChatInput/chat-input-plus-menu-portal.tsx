'use client'

import { createPortal } from 'react-dom'
import {
  ChatInputPlusMenuView,
  type ChatInputPlusMenuViewProps,
} from './chat-input-plus-menu-view'

export interface ChatInputPlusMenuPortalProps extends ChatInputPlusMenuViewProps {
  open: boolean
  portalTarget?: HTMLElement | null
}

export function ChatInputPlusMenuPortal({
  open,
  portalTarget,
  ...viewProps
}: ChatInputPlusMenuPortalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <ChatInputPlusMenuView {...viewProps} />,
    portalTarget ?? document.body,
  )
}
