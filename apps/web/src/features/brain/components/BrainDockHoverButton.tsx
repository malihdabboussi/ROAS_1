'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION,
  TOOLBAR_DOCK_SLOT_SPRING,
} from '@/lib/ui/toolbar-motion'

interface BrainDockHoverButtonProps {
  icon: ReactNode
  label: ReactNode
  onClick: () => void
  ariaLabel: string
}

export function BrainDockHoverButton({
  icon,
  label,
  onClick,
  ariaLabel,
}: BrainDockHoverButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      layout
      transition={TOOLBAR_DOCK_SLOT_SPRING}
      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex h-7 shrink-0 items-center rounded-md p-1.5 transition-colors"
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">{icon}</span>
      <AnimatePresence initial={false}>
        {hovered ? (
          <motion.span
            key="label"
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
            transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
            className="overflow-hidden whitespace-nowrap text-xs font-medium"
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  )
}
