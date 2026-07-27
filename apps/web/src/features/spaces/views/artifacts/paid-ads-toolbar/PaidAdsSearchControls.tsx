'use client'

import { Library, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
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
    <div className="flex shrink-0 flex-wrap items-center gap-1">
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
          label={
            includeCampaignArtifacts ? 'Campaign artifacts included' : 'Include campaign artifacts'
          }
          side="bottom"
        >
          <span className="inline-flex shrink-0 items-center">
            <button
              type="button"
              onClick={loadCampaignArtifacts}
              className={
                includeCampaignArtifacts
                  ? 'badge-glass badge-glass-blue body-3 rounded-spacing-2 h-spacing-7 px-spacing-2 py-spacing-1 inline-flex shrink-0 items-center gap-1 font-medium transition-opacity hover:opacity-90'
                  : 'btn-icon-glass text-muted-foreground hover:text-foreground'
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
        <div className="h-spacing-7 flex items-center">
          {spaceToolbarSearchOpen ? (
            <div className="w-spacing-44 h-spacing-7 flex items-center overflow-hidden">
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
                placeholder="Search ads"
                aria-label="Search ads"
                className="input-glass body-4 h-spacing-7 w-full"
              />
            </div>
          ) : null}
          <Tooltip
            label="Search ads"
            side="bottom"
            triggerClassName="flex h-spacing-7 items-center"
          >
            <span className="h-spacing-7 inline-flex items-center">
              <button
                type="button"
                onClick={() => setSpaceToolbarSearchOpen(true)}
                className={`btn-icon-glass ${
                  spaceToolbarSearchOpen || artifactConfig.search_query
                    ? 'btn-icon-glass--active text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Search ads"
              >
                <Search className="icon-sm" />
              </button>
            </span>
          </Tooltip>
        </div>
      ) : null}
    </div>
  )
}
