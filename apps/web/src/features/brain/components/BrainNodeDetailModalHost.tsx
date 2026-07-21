'use client'

import { useCallback, useMemo } from 'react'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import type { BrainMemory } from '../types'
import NodeDetailModal from './NodeDetailModal'

type BrainNodeDetailModalHostProps = {
  connectedNodes: BrainMemory[]
  isCampaignScope: boolean
  isKnowledgeScope: boolean
  loadGraph: (agentId?: string, brainId?: string) => void
  refreshCampaignGraph: () => void
  refreshKnowledgeGraph: () => void
  scopeOptions: BrainScopeNavOption[]
  selectedAgentId?: string
  selectedNode: BrainMemory | null
  selectedScope?: BrainScopeNavOption
  selectNode: (node: BrainMemory | null) => void
}

type NodeDetailTransferSourceOption = BrainScopeNavOption & {
  scopeType: 'user' | 'person' | 'agent' | 'campaign'
}

function isTransferScopeOption(
  option: BrainScopeNavOption,
): option is NodeDetailTransferSourceOption {
  return (
    option.scopeType !== 'customer' &&
    option.scopeType !== 'company' &&
    option.scopeType !== 'shared' &&
    option.scopeType !== 'campaign_knowledge'
  )
}

export function BrainNodeDetailModalHost({
  connectedNodes,
  isCampaignScope,
  isKnowledgeScope,
  loadGraph,
  refreshCampaignGraph,
  refreshKnowledgeGraph,
  scopeOptions,
  selectedAgentId,
  selectedNode,
  selectedScope,
  selectNode,
}: BrainNodeDetailModalHostProps) {
  const transferScopeOptions = useMemo(
    () =>
      scopeOptions.filter(isTransferScopeOption).map((option) => ({
        id: option.id,
        label: option.label,
        scopeType: option.scopeType === 'person' ? ('user' as const) : option.scopeType,
        agentId: option.agentId,
        campaignId: option.campaignId,
      })),
    [scopeOptions],
  )

  const handleClose = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  const handleDeleted = useCallback(() => {
    const brainId = selectedScope?.brainId ?? undefined
    if (isCampaignScope) {
      void refreshCampaignGraph()
    } else if (isKnowledgeScope) {
      void refreshKnowledgeGraph()
    } else {
      loadGraph(selectedAgentId, brainId)
    }
  }, [
    isCampaignScope,
    isKnowledgeScope,
    loadGraph,
    refreshCampaignGraph,
    refreshKnowledgeGraph,
    selectedAgentId,
    selectedScope?.brainId,
  ])

  if (!selectedNode) return null

  return (
    <NodeDetailModal
      node={selectedNode}
      scopeType={selectedScope?.scopeType === 'person' ? 'user' : selectedScope?.scopeType}
      campaignId={selectedScope?.campaignId ?? null}
      agentId={selectedScope?.agentId ?? null}
      currentScopeId={selectedScope?.id ?? null}
      scopeOptions={transferScopeOptions}
      connectedNodes={connectedNodes}
      onClose={handleClose}
      onDeleted={handleDeleted}
    />
  )
}
