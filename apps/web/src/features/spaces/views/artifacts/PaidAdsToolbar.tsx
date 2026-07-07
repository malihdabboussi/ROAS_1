'use client'

import { AnimatePresence } from 'framer-motion'
import { resolvePaidAdsHierarchyMode } from '@/features/spaces/lib/paid-ads-display-mode'
import type { PaidAdsHierarchyMode } from '@/features/spaces/types/space-schema'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import type { SpaceToolbarContext } from '../types'
import { ArtifactDetailToolbar } from './ArtifactDetailToolbar'
import { PaidAdsMetaRefreshButton } from './paid-ads-toolbar/PaidAdsMetaRefreshButton'
import { PaidAdsModeMenu } from './paid-ads-toolbar/PaidAdsModeMenu'
import { PaidAdsPrimaryActions } from './paid-ads-toolbar/PaidAdsPrimaryActions'
import { PaidAdsSearchControls } from './paid-ads-toolbar/PaidAdsSearchControls'

export function PaidAdsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    activeSpace,
    showGroupByInToolbar,
    showAddColumnsToolbar,
    artifactConfig,
    artifactCampaignId,
    includeCampaignArtifacts,
    artifactSlidePreviewOpen,
    artifactDetailOpen,
    handleArtifactConfigPatch,
    handleViewPatch,
    handleCreateArtifact,
    loadCampaignArtifacts,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  const hierarchyMode = resolvePaidAdsHierarchyMode(activeView)
  const isCreativesMode = hierarchyMode === 'creatives'
  const hideListToolbar = artifactSlidePreviewOpen || artifactDetailOpen
  const canSwitchMode = activeView?.type === 'ads'

  const setHierarchyMode = (mode: PaidAdsHierarchyMode) => {
    if (!activeView || !canSwitchMode) return
    void handleViewPatch({
      ads_config: { ...(activeView.ads_config ?? {}), paid_ads_mode: mode },
    })
  }

  const createLabel =
    hierarchyMode === 'structure' ? 'Campaign' : hierarchyMode === 'ad_sets' ? 'Ad set' : 'Ad'

  if (artifactDetailOpen) {
    return <ArtifactDetailToolbar ctx={ctx} />
  }

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        <PaidAdsModeMenu
          hierarchyMode={hierarchyMode}
          canSwitchMode={canSwitchMode}
          onHierarchyModeChange={setHierarchyMode}
        />
        {showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {activeView ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {!hideListToolbar ? (
              <PaidAdsSearchControls
                isCreativesMode={isCreativesMode}
                artifactConfig={artifactConfig}
                artifactCampaignId={artifactCampaignId}
                includeCampaignArtifacts={includeCampaignArtifacts}
                loadCampaignArtifacts={loadCampaignArtifacts}
                spaceToolbarSearchOpen={spaceToolbarSearchOpen}
                setSpaceToolbarSearchOpen={setSpaceToolbarSearchOpen}
                handleArtifactConfigPatch={handleArtifactConfigPatch}
              />
            ) : null}
          </AnimatePresence>
        ) : null}
        {activeView && !hideListToolbar ? (
          <PaidAdsMetaRefreshButton campaignId={activeSpace.campaign_id ?? null} />
        ) : null}
        {activeView && !hideListToolbar ? (
          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        ) : null}
        {activeView ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {!hideListToolbar ? (
              <PaidAdsPrimaryActions
                hierarchyMode={hierarchyMode}
                campaignId={activeSpace.campaign_id ?? null}
                createLabel={createLabel}
                schemaEditorOpen={schemaEditorOpen}
                closeCustomizePanel={closeCustomizePanel}
                openCustomizeFromToolbar={openCustomizeFromToolbar}
                loadCampaignArtifacts={loadCampaignArtifacts}
                handleCreateArtifact={handleCreateArtifact}
              />
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>
    </ToolbarShell>
  )
}
