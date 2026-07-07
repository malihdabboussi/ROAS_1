'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Library, Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { CreateFunnelTypeModal } from '../../components/artifacts/funnels/CreateFunnelTypeModal'
import { ReportingTimeRangeSelector } from '../../components/reporting/shared/ReportingTimeRangeSelector'
import { SpaceCustomizeButton } from '../../components/toolbar'
import { ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION } from '@/lib/ui/toolbar-motion'
import type { SpaceToolbarContext } from '../types'
import { ArtifactDetailToolbar } from './ArtifactDetailToolbar'
import { PresentationCreateMenu } from './PresentationCreateMenu'

/** Toolbar for artifact views (funnels, websites, offers, ads, sequences, etc). */
export function ArtifactsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    activeSpace,
    showGroupByInToolbar,
    showAddColumnsToolbar,
    artifactConfig,
    artifactCampaignId,
    includeCampaignArtifacts,
    artifactPrimaryLabel,
    artifactSlidePreviewOpen,
    artifactDetailOpen,
    handleArtifactConfigPatch,
    handleCreateArtifact,
    handleCreatePresentationFromHtml,
    handleCreateFunnel,
    loadCampaignArtifacts,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  const [funnelTypeModalOpen, setFunnelTypeModalOpen] = useState(false)
  const [funnelCreateSubmitting, setFunnelCreateSubmitting] = useState(false)

  const hideListToolbar = artifactSlidePreviewOpen || artifactDetailOpen

  if (artifactDetailOpen) {
    const t = activeView?.type
    if (
      t === 'funnels' ||
      t === 'websites' ||
      t === 'presentations' ||
      t === 'social_posts' ||
      t === 'sequences' ||
      t === 'emails' ||
      t === 'avatars' ||
      t === 'ads' ||
      t === 'forms'
    ) {
      return null
    }
    return <ArtifactDetailToolbar ctx={ctx} />
  }

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        {showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {activeView ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {!hideListToolbar ? (
              <motion.div
                key="artifact-toolbar-time-search"
                className="flex shrink-0 flex-wrap items-center gap-1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
              >
                <ReportingTimeRangeSelector
                  variant="badge"
                  config={{
                    time_range: artifactConfig.time_range,
                    custom_start: artifactConfig.custom_start,
                    custom_end: artifactConfig.custom_end,
                  }}
                  onConfigPatch={(patch) => void handleArtifactConfigPatch(patch)}
                />
                {artifactCampaignId ? (
                  <Tooltip
                    label={
                      includeCampaignArtifacts
                        ? 'Campaign artifacts included'
                        : 'Include campaign artifacts'
                    }
                    side="bottom"
                  >
                    <span className="inline-flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={loadCampaignArtifacts}
                        className={
                          includeCampaignArtifacts
                            ? 'badge-glass badge-glass-blue body-3 rounded-spacing-2 inline-flex h-7 shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90'
                            : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                        }
                        aria-label="Include campaign artifacts"
                        aria-pressed={includeCampaignArtifacts}
                      >
                        <Library className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </span>
                  </Tooltip>
                ) : null}
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
                          value={artifactConfig.search_query ?? ''}
                          onChange={(e) =>
                            void handleArtifactConfigPatch({ search_query: e.target.value })
                          }
                          onBlur={() => {
                            if (!artifactConfig.search_query) setSpaceToolbarSearchOpen(false)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              void handleArtifactConfigPatch({ search_query: '' })
                              setSpaceToolbarSearchOpen(false)
                            }
                          }}
                          placeholder="Search..."
                          className="h-7 w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Tooltip
                    label="Search artifacts"
                    side="bottom"
                    triggerClassName="flex h-7 items-center"
                  >
                    <span className="inline-flex h-7 items-center">
                      <button
                        type="button"
                        onClick={() => setSpaceToolbarSearchOpen(true)}
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                          spaceToolbarSearchOpen || artifactConfig.search_query
                            ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
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
        {activeView && !hideListToolbar && activeView.type !== 'all_artifacts' ? (
          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        ) : null}
        {activeView ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {!hideListToolbar ? (
              <motion.div
                key="artifact-toolbar-custom-plus"
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
                {activeView.type === 'presentations' ? (
                  <PresentationCreateMenu
                    disabled={!activeSpace.campaign_id}
                    onBlank={() => {
                      loadCampaignArtifacts()
                      void handleCreateArtifact()
                    }}
                    onUploadHtml={(file) => {
                      loadCampaignArtifacts()
                      void handleCreatePresentationFromHtml(file)
                    }}
                  />
                ) : activeView.type !== 'all_artifacts' ? (
                  <Tooltip
                    label={
                      activeSpace.campaign_id
                        ? `New ${artifactPrimaryLabel.toLowerCase()}`
                        : 'Artifacts require a campaign'
                    }
                    side="bottom"
                  >
                    <span className="inline-flex">
                      <button
                        type="button"
                        disabled={!activeSpace.campaign_id}
                        onClick={() => {
                          loadCampaignArtifacts()
                          if (activeView.type === 'funnels') {
                            setFunnelTypeModalOpen(true)
                            return
                          }
                          void handleCreateArtifact()
                        }}
                        className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                        aria-label={`New ${artifactPrimaryLabel.toLowerCase()}`}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        {artifactPrimaryLabel}
                      </button>
                    </span>
                  </Tooltip>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>
      {activeView?.type === 'funnels' ? (
        <CreateFunnelTypeModal
          open={funnelTypeModalOpen}
          submitting={funnelCreateSubmitting}
          onClose={() => {
            if (!funnelCreateSubmitting) setFunnelTypeModalOpen(false)
          }}
          onSelect={async (funnelType) => {
            setFunnelCreateSubmitting(true)
            try {
              await handleCreateFunnel(funnelType)
              setFunnelTypeModalOpen(false)
            } finally {
              setFunnelCreateSubmitting(false)
            }
          }}
        />
      ) : null}
    </ToolbarShell>
  )
}
