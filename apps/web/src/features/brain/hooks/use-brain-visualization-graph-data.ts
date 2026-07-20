'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCampaignKnowledgeGraph } from '@/lib/campaigns'
import {
  campaignGraphSnapshotByCampaignId,
  campaignKnowledgeToBrainScopeGraph,
  knowledgeGraphSnapshotByCampaignId,
} from '../lib/brain-campaign-scope-graph'
import type { BrainScopeRuntimeState } from '../lib/brain-scope-runtime'
import { knowledgeObjectsToBrainGraph } from '../lib/knowledge-graph-mappers'
import { fetchCampaignKnowledgeRollupGraph } from '../services/knowledge-graph.service'
import type { BrainGraphData } from '../types'
import type { BrainScopeNavOption } from './use-brain-scope-nav-options'

type BrainVisualizationGraphDataScope = Pick<
  BrainScopeNavOption,
  'brainId' | 'campaignId' | 'scopeType'
>

type BrainStoreGraphLoaders = {
  clearActiveScope: () => void
  loadCognition: (brainId?: string | null) => void
  loadCustomerAvatars: (brainId: string) => void
  loadGraph: (agentId?: string, brainId?: string) => void
  loadHealth: (agentId?: string, brainId?: string) => void
}

type UseBrainVisualizationGraphDataInput = BrainStoreGraphLoaders & {
  brainScopeRuntime: Pick<BrainScopeRuntimeState, 'graphBrainId'>
  graphData: BrainGraphData | null
  loading: boolean
  selectedAgentId?: string
  selectedScope?: BrainVisualizationGraphDataScope
  topRightScopeReady: boolean
}

export function useBrainVisualizationGraphData({
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
}: UseBrainVisualizationGraphDataInput) {
  const [campaignGraphData, setCampaignGraphData] = useState<BrainGraphData | null>(null)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [knowledgeGraphData, setKnowledgeGraphData] = useState<BrainGraphData | null>(null)
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)

  const isCampaignScope = selectedScope?.scopeType === 'campaign'
  const isCampaignKnowledgeScope = selectedScope?.scopeType === 'campaign_knowledge'
  const isKnowledgeScope = isCampaignKnowledgeScope
  const activeCampaignId =
    isCampaignScope || isCampaignKnowledgeScope ? selectedScope?.campaignId : undefined

  const refreshCampaignGraph = useCallback(async () => {
    if (!activeCampaignId) return
    setCampaignLoading(true)
    try {
      const data = await fetchCampaignKnowledgeGraph(activeCampaignId)
      const mapped = campaignKnowledgeToBrainScopeGraph(data.nodes, data.edges)
      campaignGraphSnapshotByCampaignId.set(activeCampaignId, mapped)
      setCampaignGraphData(mapped)
    } catch {
      campaignGraphSnapshotByCampaignId.delete(activeCampaignId)
      setCampaignGraphData(null)
    } finally {
      setCampaignLoading(false)
    }
  }, [activeCampaignId])

  const refreshKnowledgeGraph = useCallback(async () => {
    if (!isKnowledgeScope || !activeCampaignId) return
    setKnowledgeLoading(true)
    try {
      const data = await fetchCampaignKnowledgeRollupGraph(activeCampaignId)
      const mapped = knowledgeObjectsToBrainGraph(
        data.objects,
        data.edges,
        data.scope.type,
        data.stats,
      )
      knowledgeGraphSnapshotByCampaignId.set(activeCampaignId, mapped)
      setKnowledgeGraphData(mapped)
    } catch {
      knowledgeGraphSnapshotByCampaignId.delete(activeCampaignId)
      setKnowledgeGraphData(null)
    } finally {
      setKnowledgeLoading(false)
    }
  }, [activeCampaignId, isKnowledgeScope])

  useEffect(() => {
    if (!topRightScopeReady) {
      setCampaignGraphData(null)
      setKnowledgeGraphData(null)
      clearActiveScope()
      return
    }

    if (isKnowledgeScope) {
      setCampaignGraphData(null)
      setKnowledgeGraphData(
        activeCampaignId
          ? (knowledgeGraphSnapshotByCampaignId.get(activeCampaignId) ?? null)
          : null,
      )
      void refreshKnowledgeGraph()
    } else if (isCampaignScope && activeCampaignId) {
      setKnowledgeGraphData(null)
      setCampaignGraphData(campaignGraphSnapshotByCampaignId.get(activeCampaignId) ?? null)
      void refreshCampaignGraph()
    } else {
      setCampaignGraphData(null)
      setKnowledgeGraphData(null)
      const isCustomerScope = selectedScope?.scopeType === 'customer'
      const isCompanyScope = selectedScope?.scopeType === 'company'
      const graphBrainId = brainScopeRuntime.graphBrainId
      if (graphBrainId) {
        loadGraph(selectedAgentId, graphBrainId)
      } else {
        loadGraph(selectedAgentId)
      }
      loadHealth(selectedAgentId, graphBrainId)
      if (
        selectedScope?.scopeType === 'user' ||
        selectedScope?.scopeType === 'shared' ||
        selectedScope?.scopeType === 'agent' ||
        isCompanyScope ||
        isCustomerScope
      ) {
        if (selectedScope.brainId) {
          void loadCognition(selectedScope.brainId)
        } else if (selectedScope.scopeType === 'user') {
          void loadCognition(null)
        }
      }
      if (isCustomerScope && selectedScope?.brainId) {
        void loadCustomerAvatars(selectedScope.brainId)
      }
    }
  }, [
    loadGraph,
    loadHealth,
    loadCognition,
    loadCustomerAvatars,
    clearActiveScope,
    selectedAgentId,
    selectedScope?.brainId,
    selectedScope?.scopeType,
    brainScopeRuntime.graphBrainId,
    isCampaignScope,
    isKnowledgeScope,
    activeCampaignId,
    refreshKnowledgeGraph,
    refreshCampaignGraph,
    topRightScopeReady,
  ])

  const handleQueueJobComplete = useCallback(() => {
    if (!topRightScopeReady) return
    if (isKnowledgeScope) {
      void refreshKnowledgeGraph()
      return
    }
    if (isCampaignScope) {
      void refreshCampaignGraph()
      return
    }
    const graphBrainId = brainScopeRuntime.graphBrainId
    void loadGraph(selectedAgentId, graphBrainId)
  }, [
    isCampaignScope,
    isKnowledgeScope,
    loadGraph,
    brainScopeRuntime.graphBrainId,
    refreshKnowledgeGraph,
    refreshCampaignGraph,
    selectedAgentId,
    topRightScopeReady,
  ])

  const activeGraphData = useMemo(
    () => (isKnowledgeScope ? knowledgeGraphData : isCampaignScope ? campaignGraphData : graphData),
    [campaignGraphData, graphData, isCampaignScope, isKnowledgeScope, knowledgeGraphData],
  )
  const activeLoading = isKnowledgeScope
    ? knowledgeLoading
    : isCampaignScope
      ? campaignLoading
      : loading

  return {
    activeCampaignId,
    activeGraphData,
    activeLoading,
    handleQueueJobComplete,
    isCampaignKnowledgeScope,
    isCampaignScope,
    isKnowledgeScope,
    refreshCampaignGraph,
    refreshKnowledgeGraph,
    searchGraphData: activeGraphData,
  }
}
