'use client'

import { type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface AnimatedArtifactTitleProps {
  text: string
  className?: string
}

/**
 * Fades the previous title out and wipes the new title in left-to-right (typewriter feel).
 * Preserves single-line truncation: animates `clipPath` on a stable text node, no character splitting.
 * Used by `ArtifactPreviewPane` so the slide-over chrome stays mounted between same-type selections
 * while the displayed name still telegraphs the change.
 */
export function AnimatedArtifactTitle({
  text,
  className,
}: AnimatedArtifactTitleProps): ReactElement {
  return (
    <span className={`relative inline-block min-w-0 ${className ?? ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          className="block truncate"
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          exit={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          transition={{ duration: 0.16, ease: [0.33, 1, 0.68, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
