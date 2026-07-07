'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { useArtifactDetailQuery } from '../../components/artifacts/use-artifact-detail-query'
import type { SpaceToolbarContext } from '../types'

/** Toolbar strip when an artifact is open in deep-work (`?artifact=`) mode. */
export function ArtifactDetailToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const { setArtifactQuery } = useArtifactDetailQuery()
  const title = ctx.artifactDeepDetail?.title ?? 'Artifact'

  return (
    <ToolbarShell ctx={ctx} artifactDetailLayout>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="artifact-detail-back"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={() => setArtifactQuery(null)}
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
