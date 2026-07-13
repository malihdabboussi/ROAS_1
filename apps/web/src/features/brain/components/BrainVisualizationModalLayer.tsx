'use client'

import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import CortexMaxModal from './CortexMaxModal'
import { CrystallizeBrainModal } from './CrystallizeBrainModal'

type BrainVisualizationModalScope = Pick<
  BrainScopeNavOption,
  'agentId' | 'brainId' | 'campaignId' | 'id' | 'label' | 'scopeType'
>

interface BrainVisualizationModalLayerProps {
  cortexMaxOpen: boolean
  crystallizeOpen: boolean
  memoryCount: number
  onCortexMaxOpenChange: (open: boolean) => void
  onCrystallizeOpenChange: (open: boolean) => void
  onRefreshQueueJobs: () => void
  selectedScope?: BrainVisualizationModalScope
  topRightScopeReady: boolean
}

export function BrainVisualizationModalLayer({
  cortexMaxOpen,
  crystallizeOpen,
  memoryCount,
  onCortexMaxOpenChange,
  onCrystallizeOpenChange,
  onRefreshQueueJobs,
  selectedScope,
  topRightScopeReady,
}: BrainVisualizationModalLayerProps) {
  return (
    <>
      <CortexMaxModal
        open={cortexMaxOpen}
        onOpenChange={onCortexMaxOpenChange}
        brainId={selectedScope?.brainId ?? null}
        memoryCount={memoryCount}
        scopeType={
          selectedScope?.scopeType === 'campaign_knowledge'
            ? 'user'
            : (selectedScope?.scopeType ?? 'user')
        }
      />

      {topRightScopeReady && selectedScope?.brainId ? (
        <CrystallizeBrainModal
          open={crystallizeOpen}
          onOpenChange={onCrystallizeOpenChange}
          brainId={selectedScope.brainId}
          brainLabel={selectedScope.label}
          onQueued={onRefreshQueueJobs}
        />
      ) : null}
    </>
  )
}
