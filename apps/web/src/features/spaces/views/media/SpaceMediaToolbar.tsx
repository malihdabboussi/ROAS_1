'use client'

import { useCallback, useRef } from 'react'
import { Search, Upload } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
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
        <div className="relative flex shrink-0 flex-nowrap items-center gap-1">
          {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <SaveViewSlot ctx={ctx} />
          {activeView ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <MediaTypeFilterControl mergedMediaConfig={mc} onPatch={patchMc} />
              <MediaPreviewCardSizeControl mergedMediaConfig={mc} onPatch={patchMc} />
              {spaceToolbarSearchOpen ? (
                <label className="relative block w-44">
                  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
                  <input
                    autoFocus
                    type="search"
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
                    placeholder="Search media…"
                    aria-label="Search media"
                    className="input-leading h-spacing-7 pr-spacing-2 body-4 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground w-full border outline-none"
                  />
                </label>
              ) : (
                <Tooltip label="Search media" side="bottom">
                  <button
                    type="button"
                    onClick={() => setSpaceToolbarSearchOpen(true)}
                    className={`btn-icon-bare ${
                      mc.search_query
                        ? 'btn-icon-glass--active'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Search media"
                  >
                    <Search className="icon-sm" />
                  </button>
                </Tooltip>
              )}
            </div>
          ) : null}
          {activeView ? (
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
          ) : null}
          {activeView ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <SpaceCustomizeButton
                schemaEditorOpen={schemaEditorOpen}
                closeCustomizePanel={closeCustomizePanel}
                openCustomizeFromToolbar={openCustomizeFromToolbar}
              />
              <Tooltip label={presentation.uploadTooltip} side="bottom">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="button-compact button-glass-primary gap-spacing-1"
                >
                  <Upload className="icon-sm shrink-0" />
                  {presentation.uploadLabel}
                </button>
              </Tooltip>
            </div>
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
