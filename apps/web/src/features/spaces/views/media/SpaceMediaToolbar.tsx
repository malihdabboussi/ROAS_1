'use client'

import { useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Upload } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import { ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION } from '@/lib/ui/toolbar-motion'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { SpaceCustomizeButton } from '../../components/toolbar'
import { resolveMediaTypeFilters } from '../../types/space-schema'
import type { SpaceToolbarContext } from '../types'
import { resolveMediaViewPresentation } from './media-view-presentation'
import { MediaDetailToolbar } from './MediaDetailToolbar'
import { MediaPreviewCardSizeControl } from './MediaPreviewCardSizeControl'
import { MediaTypeFilterControl } from './MediaTypeFilterControl'

export function SpaceMediaToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    activeSpace,
    handleMediaViewConfigPatch,
    mediaDetailOpen,
    showGroupByInToolbar,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  const mc = ctx.mediaViewConfig
  const presentation = resolveMediaViewPresentation(resolveMediaTypeFilters(mc))
  const hideListToolbar = mediaDetailOpen

  const fileRef = useRef<HTMLInputElement>(null)
  const { upload } = usePresignedUpload()

  const patchMc = useCallback(
    (patch: Parameters<typeof handleMediaViewConfigPatch>[0]) => {
      void handleMediaViewConfigPatch(patch)
    },
    [handleMediaViewConfigPatch],
  )

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return
      const campaignId = activeSpace.campaign_id ?? undefined
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)
        if (!file) continue
        await upload({
          file,
          category: 'upload',
          campaign_id: campaignId,
          space_id: activeSpace.id,
        })
      }
      fileRef.current!.value = ''
    },
    [activeSpace.campaign_id, activeSpace.id, upload],
  )

  if (mediaDetailOpen) {
    return <MediaDetailToolbar ctx={ctx} />
  }

  return (
    <>
      <ToolbarShell ctx={ctx}>
        <div className="relative flex min-w-0 flex-nowrap items-center gap-1">
          {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <SaveViewSlot ctx={ctx} />
          {activeView ? (
            <AnimatePresence mode="popLayout" initial={false}>
              {!hideListToolbar ? (
                <motion.div
                  key="media-toolbar-search"
                  className="flex shrink-0 flex-wrap items-center gap-1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 28 }}
                  transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
                >
                  <MediaTypeFilterControl mergedMediaConfig={mc} onPatch={patchMc} />
                  <MediaPreviewCardSizeControl mergedMediaConfig={mc} onPatch={patchMc} />
                  <div className="flex h-7 items-center">
                    <AnimatePresence>
                      {spaceToolbarSearchOpen && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 180, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="flex h-7 items-center overflow-hidden"
                        >
                          <input
                            autoFocus
                            type="text"
                            value={mc.search_query ?? ''}
                            onChange={(e) => void patchMc({ search_query: e.target.value })}
                            onBlur={() => {
                              if (!mc.search_query) setSpaceToolbarSearchOpen(false)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                void patchMc({ search_query: '' })
                                setSpaceToolbarSearchOpen(false)
                              }
                            }}
                            placeholder="Search..."
                            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary h-7 w-full rounded-lg border px-2.5 text-xs outline-none"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Tooltip
                      label="Search media"
                      side="bottom"
                      triggerClassName="flex h-7 items-center"
                    >
                      <span className="inline-flex h-7 items-center">
                        <button
                          type="button"
                          onClick={() => setSpaceToolbarSearchOpen(true)}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                            spaceToolbarSearchOpen || mc.search_query
                              ? 'bg-hover-subtle text-foreground'
                              : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                          }`}
                        >
                          <Search className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </Tooltip>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : null}
          {activeView && !hideListToolbar ? (
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
          ) : null}
          {activeView ? (
            <AnimatePresence mode="popLayout" initial={false}>
              {!hideListToolbar ? (
                <motion.div
                  key="media-toolbar-custom-plus"
                  className="flex shrink-0 flex-wrap items-center gap-1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 28 }}
                  transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
                >
                  <SpaceCustomizeButton
                    schemaEditorOpen={schemaEditorOpen}
                    closeCustomizePanel={closeCustomizePanel}
                    openCustomizeFromToolbar={openCustomizeFromToolbar}
                  />
                  <Tooltip label={presentation.uploadTooltip} side="bottom">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
                    >
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                      {presentation.uploadLabel}
                    </button>
                  </Tooltip>
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : null}
        </div>
      </ToolbarShell>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        accept={presentation.uploadAccept}
        onChange={(e) => void onFiles(e.target.files)}
      />
    </>
  )
}
