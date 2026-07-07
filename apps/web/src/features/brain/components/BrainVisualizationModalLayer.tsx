'use client'

import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { brainScopeToLiveScope, type BrainScopeLiveInput } from '../lib/brain-scope-nav'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import CortexMaxModal from './CortexMaxModal'
import { CrystallizeBrainModal } from './CrystallizeBrainModal'

const BrainVoiceOrb = dynamic(
  () => import('./BrainVoiceOrb').then((m) => ({ default: m.BrainVoiceOrb })),
  { ssr: false },
)

type BrainVisualizationModalScope = Pick<
  BrainScopeNavOption,
  'agentId' | 'brainId' | 'campaignId' | 'id' | 'label' | 'scopeType'
>

type BrainVisualizationVoiceScope = BrainVisualizationModalScope & {
  scopeType: BrainScopeLiveInput['scopeType']
}

interface BrainVisualizationModalLayerProps {
  cortexMaxOpen: boolean
  crystallizeOpen: boolean
  memoryCount: number
  onCortexMaxOpenChange: (open: boolean) => void
  onCrystallizeOpenChange: (open: boolean) => void
  onRefreshQueueJobs: () => void
  onVoiceSessionOpenChange: (open: boolean) => void
  selectedScope?: BrainVisualizationModalScope
  topRightScopeReady: boolean
  voiceSessionOpen: boolean
}

function isBrainVoiceScope(
  scope?: BrainVisualizationModalScope,
): scope is BrainVisualizationVoiceScope {
  return (
    scope?.scopeType === 'user' ||
    scope?.scopeType === 'shared' ||
    scope?.scopeType === 'agent' ||
    scope?.scopeType === 'campaign' ||
    scope?.scopeType === 'customer' ||
    scope?.scopeType === 'company'
  )
}

export function BrainVisualizationModalLayer({
  cortexMaxOpen,
  crystallizeOpen,
  memoryCount,
  onCortexMaxOpenChange,
  onCrystallizeOpenChange,
  onRefreshQueueJobs,
  onVoiceSessionOpenChange,
  selectedScope,
  topRightScopeReady,
  voiceSessionOpen,
}: BrainVisualizationModalLayerProps) {
  const voiceScope = isBrainVoiceScope(selectedScope)
    ? brainScopeToLiveScope({
        scopeType: selectedScope.scopeType,
        id: selectedScope.id,
        agentId: selectedScope.agentId,
        campaignId: selectedScope.campaignId,
        brainId: selectedScope.brainId,
        label: selectedScope.label,
      })
    : undefined

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

      {voiceSessionOpen
        ? createPortal(
            <BrainVoiceOrb
              onClose={() => onVoiceSessionOpenChange(false)}
              scope={voiceScope}
            />,
            document.body,
          )
        : null}
    </>
  )
}
