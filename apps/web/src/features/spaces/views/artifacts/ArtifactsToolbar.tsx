'use client'

import { useState } from 'react'
import { Library, Plus, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { CreateFunnelTypeModal } from '../../components/artifacts/funnels/CreateFunnelTypeModal'
import { ReportingTimeRangeSelector } from '../../components/reporting/shared/ReportingTimeRangeSelector'
import { SpaceCustomizeButton } from '../../components/toolbar'
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
          !hideListToolbar ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
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
                      className={`btn-icon-bare ${
                        includeCampaignArtifacts
                          ? 'btn-icon-glass--active'
                          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                      }`}
                      aria-label="Include campaign artifacts"
                      aria-pressed={includeCampaignArtifacts}
                    >
                      <Library className="icon-sm shrink-0" />
                    </button>
                  </span>
                </Tooltip>
              ) : null}
              <div className="flex h-7 items-center">
                {spaceToolbarSearchOpen ? (
                  <label className="relative block w-44">
                    <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
                    <input
                      autoFocus
                      type="search"
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
                      placeholder="Search artifacts…"
                      aria-label="Search artifacts"
                      className="input-leading h-spacing-7 pr-spacing-2 body-4 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground w-full border outline-none"
                    />
                  </label>
                ) : (
                  <Tooltip
                    label="Search artifacts"
                    side="bottom"
                    triggerClassName="flex h-7 items-center"
                  >
                    <span className="inline-flex h-7 items-center">
                      <button
                        type="button"
                        onClick={() => setSpaceToolbarSearchOpen(true)}
                        className={`btn-icon-bare ${
                          artifactConfig.search_query
                            ? 'btn-icon-glass--active'
                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                        }`}
                        aria-label="Search artifacts"
                      >
                        <Search className="icon-sm" />
                      </button>
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          ) : null
        ) : null}
        {activeView && !hideListToolbar && activeView.type !== 'all_artifacts' ? (
          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        ) : null}
        {activeView ? (
          !hideListToolbar ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
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
                      className="button-compact button-glass-primary gap-spacing-1 disabled:pointer-events-none disabled:opacity-40"
                      aria-label={`New ${artifactPrimaryLabel.toLowerCase()}`}
                    >
                      <Plus className="icon-sm shrink-0" />
                      {artifactPrimaryLabel}
                    </button>
                  </span>
                </Tooltip>
              ) : null}
            </div>
          ) : null
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
