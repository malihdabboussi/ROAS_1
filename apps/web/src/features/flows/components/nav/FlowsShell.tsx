'use client'

import type { FlowScopeLocation } from '../../lib/resolve-flow-scope-locations'
import type { FlowsPanelTab } from '../../types/flows-page.types'
import type { FlowSpaceNavItem } from '../../types/flow-space.types'
import { FlowsBreadcrumbHeader } from './FlowsBreadcrumbHeader'
import { FlowsSectionTabs } from './FlowsSectionTabs'

export function FlowsShell({
  activeTab,
  onSelectTab,
  spaces,
  selectedCampaignId,
  onSelectCampaign,
  selectedSpaceId,
  onSelectSpace,
  flowName,
  onRenameFlow,
  renameFlowDisabled,
  flowDescription,
  onUpdateDescription,
  descriptionDisabled,
  onNavigateFlowsRoot,
  showClarificationsTab,
  hideSectionTabs,
  flowScopeLocations,
  onNavigateToFlowLocation,
  children,
}: {
  activeTab: FlowsPanelTab
  onSelectTab: (tab: FlowsPanelTab) => void
  spaces: FlowSpaceNavItem[]
  selectedCampaignId: string | null
  onSelectCampaign: (campaignId: string | null) => void
  selectedSpaceId: string | null
  onSelectSpace: (spaceId: string | null) => void
  flowName?: string | null
  onRenameFlow?: (name: string) => void | Promise<void>
  renameFlowDisabled?: boolean
  flowDescription?: string | null
  onUpdateDescription?: (description: string | null) => void | Promise<void>
  descriptionDisabled?: boolean
  onNavigateFlowsRoot?: () => void
  showClarificationsTab?: boolean
  hideSectionTabs?: boolean
  flowScopeLocations?: FlowScopeLocation[] | null
  onNavigateToFlowLocation?: (location: FlowScopeLocation) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-spacing-4 border-border flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border">
      <FlowsBreadcrumbHeader
        spaces={spaces}
        selectedCampaignId={selectedCampaignId}
        onSelectCampaign={onSelectCampaign}
        selectedSpaceId={selectedSpaceId}
        onSelectSpace={onSelectSpace}
        flowName={flowName}
        onRenameFlow={onRenameFlow}
        renameFlowDisabled={renameFlowDisabled}
        flowDescription={flowDescription}
        onUpdateDescription={onUpdateDescription}
        descriptionDisabled={descriptionDisabled}
        onNavigateFlowsRoot={onNavigateFlowsRoot}
        flowScopeLocations={flowScopeLocations}
        onNavigateToFlowLocation={onNavigateToFlowLocation}
      />
      {hideSectionTabs ? null : (
        <FlowsSectionTabs
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          showClarificationsTab={showClarificationsTab}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
