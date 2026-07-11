'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { useOrgStore } from '@/lib/org'
import { useBrainHealthRealtime } from '../hooks/use-brain-health-realtime'
import { useBrainQueue } from '../hooks/use-brain-queue'
import { useBrainRealtime } from '../hooks/use-brain-realtime'
import { useBrainScopeNavOptions } from '../hooks/use-brain-scope-nav-options'
import { useBrainVisualizationActions } from '../hooks/use-brain-visualization-actions'
import { useBrainVisualizationGraphData } from '../hooks/use-brain-visualization-graph-data'
import { useBrainVisualizationScopeSelection } from '../hooks/use-brain-visualization-scope-selection'
import { useBrainVisualizationSearch } from '../hooks/use-brain-visualization-search'
import { useBrainVisualizationUiState } from '../hooks/use-brain-visualization-ui-state'
import { deriveBrainVisualizationGraphState } from '../lib/brain-visualization-derived-state'
import { useBrainStore } from '../store/use-brain-store'
import { BrainNodeDetailModalHost } from './BrainNodeDetailModalHost'
import { BrainVisualizationAddInfoLayer } from './BrainVisualizationAddInfoLayer'
import { BrainVisualizationBreadcrumbLayer } from './BrainVisualizationBreadcrumbLayer'
import { BrainVisualizationCanvasStage } from './BrainVisualizationCanvasStage'
import { BrainVisualizationDock } from './BrainVisualizationDock'
import { BrainVisualizationGraphControls } from './BrainVisualizationGraphControls'
import { BrainVisualizationMemoryLayer } from './BrainVisualizationMemoryLayer'
import { BrainVisualizationModalLayer } from './BrainVisualizationModalLayer'
import type { ForceGraphHandle } from './ForceGraph'

export default function BrainVisualization() {
  const {
    graphData,
    healthData,
    beliefs,
    perspectives,
    loading,
    error,
    searchQuery,
    selectedNode,
    loadGraph,
    loadHealth,
    loadCognition,
    loadCustomerAvatars,
    clearActiveScope,
    selectNode,
    memoryPanelOpen,
    setMemoryPanelOpen,
    setSearchQuery,
  } = useBrainStore()

  const searchParams = useSearchParams()
  const router = useRouter()

  const graphRef = useRef<ForceGraphHandle>(null)

  const {
    scopeOptions,
    loading: scopesLoading,
    resolved: scopeOptionsResolved,
    reload: reloadScopeNav,
  } = useBrainScopeNavOptions()
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const { brainScopeRuntime, navigateToBrainHome, selectedScope, selectedScopeId } =
    useBrainVisualizationScopeSelection({
      router,
      searchParams,
      scopeOptions,
      scopeOptionsResolved,
      scopesLoading,
    })

  const topRightScopeReady = brainScopeRuntime.ready
  const selectedAgentId = topRightScopeReady ? (selectedScope?.agentId ?? undefined) : undefined

  const {
    cortexMaxOpen,
    crystallizeOpen,
    handleActivateVoice,
    handleOpenCortexMax,
    handleOpenCrystallize,
    handleTrainBrain,
    setCortexMaxOpen,
    setCrystallizeOpen,
    setVoiceSessionOpen,
    voiceSessionOpen,
  } = useBrainVisualizationActions({
    router,
    searchParams,
    selectedScope,
    selectedScopeId,
    topRightScopeReady,
  })

  const {
    activeCampaignId,
    activeGraphData,
    activeLoading,
    handleQueueJobComplete,
    isCampaignScope,
    isKnowledgeScope,
    refreshCampaignGraph,
    refreshKnowledgeGraph,
    searchGraphData,
  } = useBrainVisualizationGraphData({
    brainScopeRuntime,
    clearActiveScope,
    graphData,
    loadCognition,
    loadCustomerAvatars,
    loadGraph,
    loadHealth,
    loading,
    selectedAgentId,
    selectedScope,
    topRightScopeReady,
  })

  const {
    searchAnchorRef: brainSearchAnchorRef,
    searchDockOpen: brainSearchDockOpen,
    searchImageInputRef,
    searchInput,
    searchLoading,
    searchResults,
    clearSearch: handleClearBrainSearch,
    handleImageSearchFileChange: handleBrainImageSearchFileChange,
    handleSearchEscape: handleBrainSearchEscape,
    handleSearchInputBlur: handleBrainSearchInputBlur,
    handleSearchInputChange: handleBrainSearchInputChange,
    handleSelectSearchResult,
    openImageSearch: handleOpenImageSearch,
    openSearchDock: handleOpenSearchDock,
  } = useBrainVisualizationSearch({
    activeCampaignId,
    isCampaignScope,
    isKnowledgeScope,
    searchGraphData,
    selectedScope,
    onSelectMemory: selectNode,
  })

  const {
    jobs: queueJobs,
    cancel: cancelQueueJob,
    retry: retryQueueJob,
    dismiss: dismissQueueJob,
    refresh: refreshQueueJobs,
  } = useBrainQueue({
    onJobComplete: handleQueueJobComplete,
    brainId: brainScopeRuntime.queueBrainId,
    campaignId: brainScopeRuntime.queueCampaignId,
    targetBrain: brainScopeRuntime.queueTargetBrain,
    enabled: brainScopeRuntime.queueEnabled,
  })

  const {
    activeQueueCount,
    brainDateRange,
    brainNodesMonochrome,
    experiencesOnly,
    handleBrainDateRangePatch,
    handleClearBrainDateRange,
    isMobileBrain,
    setExperiencesOnly,
    toggleBrainNodesMonochrome,
  } = useBrainVisualizationUiState({ queueJobs })

  useBrainRealtime({
    brainId: brainScopeRuntime.graphBrainId,
    campaignId: brainScopeRuntime.queueCampaignId,
    enabled: brainScopeRuntime.realtimeEnabled,
  })

  useBrainHealthRealtime({
    agentId: selectedAgentId,
    brainId: selectedScope?.scopeType === 'user' ? undefined : brainScopeRuntime.graphBrainId,
    enabled: brainScopeRuntime.healthRealtimeEnabled,
  })

  const {
    statsHealthForBar,
    filteredNodes,
    filteredConnections,
    brainDateFilterActive,
    selectedNodeConnectedNodes,
    counts,
    snapshotCounts,
    domainCounts,
    sourceCounts,
    legendMemoryCounts,
    legendConnectionCounts,
    legendExperienceCount,
    legendSkEntryCount,
  } = useMemo(
    () =>
      deriveBrainVisualizationGraphState({
        activeGraphData,
        brainDateRange,
        experiencesOnly,
        healthData,
        isCampaignScope,
        isKnowledgeScope,
        selectedNode,
      }),
    [
      activeGraphData,
      brainDateRange,
      experiencesOnly,
      healthData,
      isCampaignScope,
      isKnowledgeScope,
      selectedNode,
    ],
  )

  const dockShowsCognitionStats = ['user', 'shared', 'agent', 'customer', 'company'].includes(
    selectedScope?.scopeType ?? '',
  )

  return (
    <div className="bg-background border-border relative h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-2xl border p-3">
      <BrainVisualizationCanvasStage
        activeLoading={activeLoading}
        connections={filteredConnections}
        error={error}
        graphRef={graphRef}
        hasActiveGraphData={!!activeGraphData}
        nodes={filteredNodes}
        nodesMonochrome={brainNodesMonochrome}
        onNodeClick={(node) => {
          selectNode(node)
          if (node) setMemoryPanelOpen(false)
        }}
        onRetry={() => loadGraph(selectedAgentId, selectedScope?.brainId ?? undefined)}
        searchQuery={searchQuery}
        selectedNodeId={selectedNode?.id ?? null}
        viewportKey={selectedScopeId}
      />

      <BrainVisualizationBreadcrumbLayer
        scope={selectedScope}
        scopeOptions={scopeOptions}
        loading={scopesLoading}
        isOrg={isOrg}
        onNavigateHome={navigateToBrainHome}
      />

      <BrainVisualizationAddInfoLayer
        isMobileBrain={isMobileBrain}
        selectedScope={selectedScope}
        topRightScopeReady={topRightScopeReady}
        onCampaignImported={refreshCampaignGraph}
      />

      <BrainVisualizationGraphControls
        graphRef={graphRef}
        nodesMonochrome={brainNodesMonochrome}
        onToggleNodesMonochrome={toggleBrainNodesMonochrome}
        legend={{
          memoryCounts: legendMemoryCounts,
          snapshotCounts,
          memoryCount: counts.memories,
          experienceCount: legendExperienceCount,
          snapshotCount: counts.snapshots,
          skEntryCount: legendSkEntryCount,
          connectionCounts: legendConnectionCounts,
          beliefCount: beliefs.length,
          perspectiveCount: perspectives.length,
          domainCounts,
          sourceCounts,
          connections: filteredConnections,
          scopeType: selectedScope?.scopeType ?? 'user',
          isAgentBrain: !!selectedScope?.agentId,
          brainId: selectedScope?.brainId,
          showCognitionCounts: !isKnowledgeScope && dockShowsCognitionStats,
        }}
      />

      <BrainNodeDetailModalHost
        selectedNode={selectedNode}
        selectedScope={selectedScope}
        scopeOptions={scopeOptions}
        connectedNodes={selectedNodeConnectedNodes}
        isCampaignScope={isCampaignScope}
        isKnowledgeScope={isKnowledgeScope}
        refreshCampaignGraph={refreshCampaignGraph}
        refreshKnowledgeGraph={refreshKnowledgeGraph}
        loadGraph={loadGraph}
        selectedAgentId={selectedAgentId}
        selectNode={selectNode}
      />
      <BrainVisualizationDock
        voiceSessionOpen={voiceSessionOpen}
        onActivateVoice={handleActivateVoice}
        searchAnchorRef={brainSearchAnchorRef}
        searchInput={searchInput}
        searchLoading={searchLoading}
        searchResults={searchResults}
        searchDockOpen={brainSearchDockOpen}
        onOpenSearchDock={handleOpenSearchDock}
        onSearchInputChange={handleBrainSearchInputChange}
        onSearchInputBlur={handleBrainSearchInputBlur}
        onSearchEscape={handleBrainSearchEscape}
        onClearSearch={handleClearBrainSearch}
        onOpenImageSearch={handleOpenImageSearch}
        onSelectSearchResult={handleSelectSearchResult}
        topRightScopeReady={topRightScopeReady}
        selectedScope={selectedScope}
        brainDateRange={brainDateRange}
        brainDateFilterActive={brainDateFilterActive}
        onBrainDateRangePatch={handleBrainDateRangePatch}
        onClearBrainDateRange={handleClearBrainDateRange}
        experiencesOnly={experiencesOnly}
        onSetExperiencesOnly={setExperiencesOnly}
        onOpenCortexMax={handleOpenCortexMax}
        onTrainBrain={handleTrainBrain}
        onOpenCrystallize={handleOpenCrystallize}
        queueJobs={queueJobs}
        onCancelQueueJob={cancelQueueJob}
        onRetryQueueJob={retryQueueJob}
        onDismissQueueJob={dismissQueueJob}
        statsHealthForBar={statsHealthForBar}
        activeQueueCount={activeQueueCount}
        beliefCount={!isKnowledgeScope && dockShowsCognitionStats ? beliefs.length : undefined}
        perspectiveCount={
          !isKnowledgeScope && dockShowsCognitionStats ? perspectives.length : undefined
        }
      />
      <BrainVisualizationMemoryLayer
        memories={filteredNodes}
        selectedMemoryId={selectedNode?.id ?? null}
        visible={memoryPanelOpen}
        searchImageInputRef={searchImageInputRef}
        onImageSearchFileChange={handleBrainImageSearchFileChange}
        onSelectMemory={selectNode}
        onSearchQueryChange={setSearchQuery}
        onMemoryPanelOpenChange={setMemoryPanelOpen}
      />

      <BrainVisualizationModalLayer
        cortexMaxOpen={cortexMaxOpen}
        crystallizeOpen={crystallizeOpen}
        memoryCount={statsHealthForBar?.total_memories ?? 0}
        onCortexMaxOpenChange={setCortexMaxOpen}
        onCrystallizeOpenChange={setCrystallizeOpen}
        onRefreshQueueJobs={refreshQueueJobs}
        onVoiceSessionOpenChange={setVoiceSessionOpen}
        selectedScope={selectedScope}
        topRightScopeReady={topRightScopeReady}
        voiceSessionOpen={voiceSessionOpen}
      />
    </div>
  )
}
