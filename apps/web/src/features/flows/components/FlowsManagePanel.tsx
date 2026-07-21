'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type { SpaceSummary } from '@/lib/spaces/spaces-api'
import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type {
  FlowBuildSessionLink,
  FlowDraftBuildLink,
} from '../types/flow-build-session-link.types'
import type {
  FlowsDraftFilter,
  FlowsEnabledFilter,
  FlowsGroupBy,
  FlowsGroupSort,
  FlowsListGroup,
  FlowsSort,
  FlowsSurfaceFilter,
  FlowsViewMode,
} from '../types/flows-page.types'
import { FlowEmptyState, FlowManageFlowsMockup } from './FlowEmptyMockups'
import { FlowsManageGridView, type FlowCardMenuHandlers } from './FlowsManageGridView'
import { FlowsManageListView } from './FlowsManageListView'
import { FlowsToolbar } from './FlowsToolbar'

interface FlowsManagePanelProps {
  viewMode: FlowsViewMode
  onViewModeChange: (next: FlowsViewMode) => void
  search: string
  onSearchChange: (next: string) => void
  searchOpen: boolean
  onSearchOpenChange: (next: boolean) => void
  draftFilter: FlowsDraftFilter
  onDraftFilterChange: (next: FlowsDraftFilter) => void
  enabledFilter: FlowsEnabledFilter
  onEnabledFilterChange: (next: FlowsEnabledFilter) => void
  triggerFilter: string
  onTriggerFilterChange: (next: string) => void
  triggerFilterOptions: Array<{ value: string; label: string }>
  surfaceFilter: FlowsSurfaceFilter
  onSurfaceFilterChange: (next: FlowsSurfaceFilter) => void
  incompleteOnly: boolean
  onIncompleteOnlyChange: (next: boolean) => void
  sort: FlowsSort
  onSortChange: (next: FlowsSort) => void
  groupBy: FlowsGroupBy
  onGroupByChange: (next: FlowsGroupBy) => void
  groupSort: FlowsGroupSort
  onGroupSortChange: (next: FlowsGroupSort) => void
  flowsLoading: boolean
  flows: FlowAutomationSummary[]
  spaces: SpaceSummary[]
  filteredFlows: FlowAutomationSummary[]
  draftFlows: FlowAutomationSummary[]
  orphanBuildSessions: FlowBuildSessionLink[]
  draftBuildLinks: Map<string, FlowDraftBuildLink>
  flowGroups: FlowsListGroup[] | null
  collapsedGroupKeys: Set<string>
  onToggleGroup: (groupKey: string) => void
  onSelectFlow: (flowId: string) => void
  onOpenDraftPlan: (flowId: string, sessionId: string) => void
  onOpenDraftFlow: (flowId: string) => void
  onOpenDraftSession: (flowId: string, conversationId: string) => void
  onOpenBuildSession: (session: FlowBuildSessionLink) => void
  menuHandlers: Omit<
    FlowCardMenuHandlers,
    'spaces' | 'onOpenPlan' | 'onOpenDraft' | 'onOpenSession'
  >
  showScopeMeta?: boolean
}

export function FlowsManagePanel({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  draftFilter,
  onDraftFilterChange,
  enabledFilter,
  onEnabledFilterChange,
  triggerFilter,
  onTriggerFilterChange,
  triggerFilterOptions,
  surfaceFilter,
  onSurfaceFilterChange,
  incompleteOnly,
  onIncompleteOnlyChange,
  sort,
  onSortChange,
  groupBy,
  onGroupByChange,
  groupSort,
  onGroupSortChange,
  flowsLoading,
  flows,
  spaces,
  filteredFlows,
  draftFlows,
  orphanBuildSessions,
  draftBuildLinks,
  flowGroups,
  collapsedGroupKeys,
  onToggleGroup,
  onSelectFlow,
  onOpenDraftPlan,
  onOpenDraftFlow,
  onOpenDraftSession,
  onOpenBuildSession,
  menuHandlers,
  showScopeMeta = false,
}: FlowsManagePanelProps) {
  const flowMenuHandlers: FlowCardMenuHandlers = {
    spaces,
    onOpenPlan: onOpenDraftPlan,
    onOpenDraft: onOpenDraftFlow,
    onOpenSession: onOpenDraftSession,
    ...menuHandlers,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative z-10 shrink-0">
        <FlowsToolbar
          view={viewMode}
          onViewChange={onViewModeChange}
          search={search}
          onSearchChange={onSearchChange}
          searchOpen={searchOpen}
          onSearchOpenChange={onSearchOpenChange}
          draftFilter={draftFilter}
          onDraftFilterChange={onDraftFilterChange}
          enabledFilter={enabledFilter}
          onEnabledFilterChange={onEnabledFilterChange}
          triggerFilter={triggerFilter}
          onTriggerFilterChange={onTriggerFilterChange}
          triggerFilterOptions={triggerFilterOptions}
          surfaceFilter={surfaceFilter}
          onSurfaceFilterChange={onSurfaceFilterChange}
          incompleteOnly={incompleteOnly}
          onIncompleteOnlyChange={onIncompleteOnlyChange}
          sort={sort}
          onSortChange={onSortChange}
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
          groupSort={groupSort}
          onGroupSortChange={onGroupSortChange}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {flowsLoading ? (
          <div className="py-spacing-8 flex h-full min-h-0 items-center justify-center">
            <VibeyLoadingOrb text={FLOWS_UI.loading} state="processing" size="md" />
          </div>
        ) : flows.length === 0 && orphanBuildSessions.length === 0 ? (
          <FlowEmptyState
            mockup={<FlowManageFlowsMockup />}
            title={FLOWS_UI.manageEmptyTitle}
            description={FLOWS_UI.manageEmptyDescription}
          />
        ) : filteredFlows.length === 0 &&
          draftFlows.length === 0 &&
          orphanBuildSessions.length === 0 ? (
          <FlowEmptyState
            mockup={<FlowManageFlowsMockup />}
            title={FLOWS_UI.manageFilterEmptyTitle}
            description={FLOWS_UI.manageFilterEmptyDescription}
          />
        ) : viewMode === 'grid' ? (
          <FlowsManageGridView
            groupBy={groupBy}
            flows={filteredFlows.filter((flow) => !flow.is_draft)}
            groups={flowGroups}
            draftFlows={draftFlows}
            orphanBuildSessions={orphanBuildSessions}
            draftBuildLinks={draftBuildLinks}
            collapsedGroupKeys={collapsedGroupKeys}
            onToggleGroup={onToggleGroup}
            onSelectFlow={onSelectFlow}
            onOpenDraftPlan={onOpenDraftPlan}
            onOpenDraftFlow={onOpenDraftFlow}
            onOpenDraftSession={onOpenDraftSession}
            onOpenBuildSession={onOpenBuildSession}
            menuHandlers={flowMenuHandlers}
            showScopeMeta={showScopeMeta}
          />
        ) : (
          <FlowsManageListView
            groupBy={groupBy}
            flows={filteredFlows.filter((flow) => !flow.is_draft)}
            groups={flowGroups}
            draftFlows={draftFlows}
            orphanBuildSessions={orphanBuildSessions}
            draftBuildLinks={draftBuildLinks}
            collapsedGroupKeys={collapsedGroupKeys}
            onToggleGroup={onToggleGroup}
            onSelectFlow={onSelectFlow}
            onOpenDraftPlan={onOpenDraftPlan}
            onOpenDraftFlow={onOpenDraftFlow}
            onOpenDraftSession={onOpenDraftSession}
            onOpenBuildSession={onOpenBuildSession}
            menuHandlers={flowMenuHandlers}
            showScopeMeta={showScopeMeta}
          />
        )}
      </div>
    </div>
  )
}
