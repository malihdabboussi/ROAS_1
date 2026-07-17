'use client'

import { Workflow } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import type { FlowSpaceNavItem } from '../../types/flow-space.types'
import { FlowsInlineNameField } from '../FlowsInlineNameField'
import { FlowsInlineDescriptionField } from '../FlowsInlineDescriptionField'
import { FlowsCampaignBreadcrumbDropdown } from './FlowsCampaignBreadcrumbDropdown'
import { FlowsFlowScopeBreadcrumb } from './FlowsFlowScopeBreadcrumb'
import { FlowsSpaceFilterBreadcrumbDropdown } from './FlowsSpaceFilterBreadcrumbDropdown'
import type { FlowScopeLocation } from '../../lib/resolve-flow-scope-locations'

export function FlowsBreadcrumbHeader({
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
  flowScopeLocations,
  onNavigateToFlowLocation,
}: {
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
  flowScopeLocations?: FlowScopeLocation[] | null
  onNavigateToFlowLocation?: (location: FlowScopeLocation) => void
}) {
  const trimmedFlowName = flowName?.trim() ?? ''
  const flowsRootActive = !trimmedFlowName

  const trail = (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={onNavigateFlowsRoot}
        className={`flex min-w-0 items-center gap-1 transition-colors ${
          flowsRootActive
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Workflow className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[140px] truncate">Flows</span>
      </button>

      <span className="text-muted-foreground/50 select-none">/</span>
      {trimmedFlowName && flowScopeLocations != null ? (
        <FlowsFlowScopeBreadcrumb
          locations={flowScopeLocations}
          onNavigateToLocation={onNavigateToFlowLocation}
        />
      ) : (
        <>
          <FlowsCampaignBreadcrumbDropdown
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={onSelectCampaign}
          />

          <span className="text-muted-foreground/50 select-none">/</span>
          <FlowsSpaceFilterBreadcrumbDropdown
            spaces={spaces}
            filterCampaignId={selectedCampaignId}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={onSelectSpace}
          />
        </>
      )}

      {trimmedFlowName && onRenameFlow ? (
        <>
          <span className="text-muted-foreground/50 select-none">/</span>
          <FlowsInlineNameField
            value={trimmedFlowName}
            onCommit={onRenameFlow}
            disabled={renameFlowDisabled}
            maxWidthClass="max-w-[200px]"
          />
          {onUpdateDescription ? (
            <>
              <span className="text-muted-foreground/50 select-none">·</span>
              <FlowsInlineDescriptionField
                value={flowDescription}
                onCommit={onUpdateDescription}
                disabled={descriptionDisabled}
                maxWidthClass="max-w-[200px]"
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )

  return <ShellBreadcrumb>{trail}</ShellBreadcrumb>
}
