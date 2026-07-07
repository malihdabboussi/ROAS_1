'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'

import { cn } from '@/lib/utils/cn'

export const CHAT_PANEL_SLIDE_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.88,
}

const subPanelMotion = {
  initial: { x: '-100%', opacity: 0.96 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0.96 },
}

const chatPanelMotion = {
  initial: { x: '16%', opacity: 0.94 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '16%', opacity: 0.94 },
}

interface ChatPanelSlideStackProps {
  panelKey: string
  chatPanel: ReactNode
  subPanel: ReactNode
}

/** Keeps chat mounted so slide transitions do not block on heavy chat unmount. */
export function ChatPanelSlideStack({ panelKey, chatPanel, subPanel }: ChatPanelSlideStackProps) {
  const isChat = panelKey === 'chat'

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <motion.div
        className={cn(
          'surface-card absolute inset-0 z-0 flex min-h-0 min-w-0 flex-col overflow-hidden will-change-transform',
          isChat ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        initial={false}
        animate={isChat ? chatPanelMotion.animate : chatPanelMotion.exit}
        transition={CHAT_PANEL_SLIDE_TRANSITION}
        aria-hidden={!isChat}
      >
        {chatPanel}
      </motion.div>
      <AnimatePresence mode="popLayout" initial={false}>
        {!isChat ? (
          <motion.div
            key={panelKey}
            className="surface-bg absolute inset-0 z-0 flex min-h-0 min-w-0 flex-col overflow-hidden will-change-transform"
            initial={subPanelMotion.initial}
            animate={subPanelMotion.animate}
            exit={subPanelMotion.exit}
            transition={CHAT_PANEL_SLIDE_TRANSITION}
          >
            {subPanel}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
