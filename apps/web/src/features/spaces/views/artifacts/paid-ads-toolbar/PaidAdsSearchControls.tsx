'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Library, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION } from '@/lib/ui/toolbar-motion'
import type { ArtifactViewBaseConfig } from '@/features/spaces/types/space-schema'
import { ReportingTimeRangeSelector } from '../../../components/reporting/shared/ReportingTimeRangeSelector'

export function PaidAdsSearchControls({
  isCreativesMode,
  artifactConfig,
  artifactCampaignId,
  includeCampaignArtifacts,
  loadCampaignArtifacts,
  spaceToolbarSearchOpen,
  setSpaceToolbarSearchOpen,
  handleArtifactConfigPatch,
}: {
  isCreativesMode: boolean
  artifactConfig: ArtifactViewBaseConfig
  artifactCampaignId: string | null
  includeCampaignArtifacts: boolean
  loadCampaignArtifacts: () => void
  spaceToolbarSearchOpen: boolean
  setSpaceToolbarSearchOpen: (open: boolean) => void
  handleArtifactConfigPatch: (patch: Partial<ArtifactViewBaseConfig>) => Promise<void> | void
}) {
  return (
    <motion.div
      key="paid-ads-toolbar-time-search"
      className="flex shrink-0 flex-wrap items-center gap-1"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
    >
      {isCreativesMode ? (
        <ReportingTimeRangeSelector
          variant="badge"
          config={{
            time_range: artifactConfig.time_range,
            custom_start: artifactConfig.custom_start,
            custom_end: artifactConfig.custom_end,
          }}
          onConfigPatch={(patch) => void handleArtifactConfigPatch(patch)}
        />
      ) : null}
      {artifactCampaignId ? (
        <Tooltip
          label={includeCampaignArtifacts ? 'Campaign artifacts included' : 'Include campaign artifacts'}
          side="bottom"
        >
          <span className="inline-flex shrink-0 items-center">
            <button
              type="button"
              onClick={loadCampaignArtifacts}
              className={
                includeCampaignArtifacts
                  ? 'badge-glass badge-glass-blue body-3 rounded-spacing-2 inline-flex h-spacing-7 shrink-0 items-center gap-1 px-spacing-2 py-spacing-1 font-medium transition-opacity hover:opacity-90'
                  : 'inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'
              }
              aria-label="Include campaign artifacts"
              aria-pressed={includeCampaignArtifacts}
            >
              <Library className="icon-sm shrink-0" />
            </button>
          </span>
        </Tooltip>
      ) : null}
      {isCreativesMode ? (
        <div className="flex h-spacing-7 items-center">
          <AnimatePresence>
            {spaceToolbarSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="flex h-spacing-7 items-center overflow-hidden"
              >
                <input
                  autoFocus
                  type="text"
                  value={artifactConfig.search_query ?? ''}
                  onChange={(event) =>
                    void handleArtifactConfigPatch({ search_query: event.target.value })
                  }
                  onBlur={() => {
                    if (!artifactConfig.search_query) setSpaceToolbarSearchOpen(false)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      void handleArtifactConfigPatch({ search_query: '' })
                      setSpaceToolbarSearchOpen(false)
                    }
                  }}
                  placeholder="Search..."
                  className="body-4 h-spacing-7 w-full rounded-spacing-2 border border-border bg-background px-spacing-2 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <Tooltip label="Search ads" side="bottom" triggerClassName="flex h-spacing-7 items-center">
            <span className="inline-flex h-spacing-7 items-center">
              <button
                type="button"
                onClick={() => setSpaceToolbarSearchOpen(true)}
                className={`inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  spaceToolbarSearchOpen || artifactConfig.search_query
                    ? 'bg-hover-subtle text-foreground'
                    : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                }`}
                aria-label="Search ads"
              >
                <Search className="icon-sm" />
              </button>
            </span>
          </Tooltip>
        </div>
      ) : null}
    </motion.div>
  )
}
