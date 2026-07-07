'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { useMediaDetailQuery } from '../../components/media/use-media-detail-query'
import type { SpaceToolbarContext } from '../types'

/** Toolbar strip when a media asset is open in full mode (`?media=`). */
export function MediaDetailToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const { setMediaQuery } = useMediaDetailQuery()
  const title = ctx.mediaDeepDetail?.title ?? 'Media'

  return (
    <ToolbarShell ctx={ctx} artifactDetailLayout>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="media-detail-back"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={() => setMediaQuery(null)}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </motion.div>
        </AnimatePresence>
        <span className="body-3 min-w-0 truncate font-semibold text-[var(--foreground)]">
          {title}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
      </div>
    </ToolbarShell>
  )
}
