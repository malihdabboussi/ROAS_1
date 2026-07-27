'use client'

import { SpaceCustomizeButton } from '@/features/spaces/components/toolbar'
import {
  isPaidAdsViewType,
  resolvePaidAdsHierarchyMode,
  resolvePaidAdsWorkspaceMode,
} from '@/features/spaces/lib/paid-ads-display-mode'
import type {
  PaidAdsHierarchyMode,
  PaidAdsWorkspaceMode,
} from '@/features/spaces/types/space-schema'
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
import { PaidAdsWorkspaceModeToggle } from './paid-ads-toolbar/PaidAdsWorkspaceModeToggle'

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
  const workspaceMode = resolvePaidAdsWorkspaceMode(activeView)
  const isReportingMode = workspaceMode === 'reporting'
  const isResearchMode = workspaceMode === 'research'
  const isProductionMode = workspaceMode === 'production'
  const isNonLaunchMode = isReportingMode || isResearchMode || isProductionMode
  const isCreativesMode = hierarchyMode === 'creatives'
  const hideListToolbar = artifactSlidePreviewOpen || artifactDetailOpen
  const canSwitchMode = isPaidAdsViewType(activeView?.type)

  const setHierarchyMode = (mode: PaidAdsHierarchyMode) => {
    if (!activeView || !canSwitchMode) return
    void handleViewPatch({
      ads_config: { ...(activeView.ads_config ?? {}), paid_ads_mode: mode },
    })
  }

  const setWorkspaceMode = (mode: PaidAdsWorkspaceMode) => {
    if (!activeView || !canSwitchMode) return
    void handleViewPatch({
      ads_config: { ...(activeView.ads_config ?? {}), paid_ads_workspace_mode: mode },
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
        {canSwitchMode ? (
          <PaidAdsWorkspaceModeToggle mode={workspaceMode} onChange={setWorkspaceMode} />
        ) : null}
        {!isNonLaunchMode && showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        {!isNonLaunchMode ? (
          <PaidAdsModeMenu
            hierarchyMode={hierarchyMode}
            canSwitchMode={canSwitchMode}
            onHierarchyModeChange={setHierarchyMode}
          />
        ) : null}
        {!isNonLaunchMode && showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {activeView && !hideListToolbar && !isNonLaunchMode ? (
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
        {activeView && !hideListToolbar && !isNonLaunchMode ? (
          <PaidAdsMetaRefreshButton campaignId={activeSpace.campaign_id ?? null} />
        ) : null}
        {activeView && !hideListToolbar && !isNonLaunchMode ? (
          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
        ) : null}
        {activeView && isNonLaunchMode ? (
          <SpaceCustomizeButton
            schemaEditorOpen={schemaEditorOpen}
            closeCustomizePanel={closeCustomizePanel}
            openCustomizeFromToolbar={openCustomizeFromToolbar}
          />
        ) : null}
        {activeView && !hideListToolbar && !isNonLaunchMode ? (
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
      </div>
    </ToolbarShell>
  )
}
