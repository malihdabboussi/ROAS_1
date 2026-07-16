'use client'

import { useCallback, useEffect, useState } from 'react'
import { brainScopeHref, type BrainScopeToolbarAction } from '../lib/brain-scope-nav'
import { requestBrainSidebarVoice } from '../lib/brain-sidebar-voice'
import { dispatchBrainTrainModal } from '../lib/brain-training-modal.events'
import type { BrainScopeNavOption } from './use-brain-scope-nav-options'

const BRAIN_SCOPE_TOOLBAR_ACTIONS = new Set<BrainScopeToolbarAction>([
  'train',
  'crystallize',
  'cortex-max',
  'voice',
  'add-info',
])

type BrainVisualizationActionsRouter = {
  replace: (href: string, options?: { scroll?: boolean }) => void
}

type BrainVisualizationActionsSearchParams = {
  get: (name: string) => string | null
}

type UseBrainVisualizationActionsInput = {
  router: BrainVisualizationActionsRouter
  searchParams: BrainVisualizationActionsSearchParams
  selectedScope?: Pick<BrainScopeNavOption, 'agentId' | 'brainId'>
  selectedScopeId: string
  topRightScopeReady: boolean
}

export function useBrainVisualizationActions({
  router,
  searchParams,
  selectedScope,
  selectedScopeId,
  topRightScopeReady,
}: UseBrainVisualizationActionsInput) {
  const [cortexMaxOpen, setCortexMaxOpen] = useState(false)
  const [crystallizeOpen, setCrystallizeOpen] = useState(false)

  useEffect(() => {
    const raw = searchParams.get('action')
    if (!raw || !BRAIN_SCOPE_TOOLBAR_ACTIONS.has(raw as BrainScopeToolbarAction)) return
    if (!topRightScopeReady) return
    const action = raw as BrainScopeToolbarAction

    if (action === 'add-info') {
      window.dispatchEvent(new CustomEvent('mobile-brain-add-info'))
    } else if (action === 'voice' && selectedScope?.brainId) {
      requestBrainSidebarVoice(selectedScope.agentId)
    } else if (selectedScope?.brainId) {
      if (action === 'train') dispatchBrainTrainModal({ scopeId: selectedScopeId })
      if (action === 'crystallize') setCrystallizeOpen(true)
      if (action === 'cortex-max') setCortexMaxOpen(true)
    }

    router.replace(brainScopeHref(selectedScopeId), { scroll: false })
  }, [router, searchParams, selectedScope?.agentId, selectedScope?.brainId, selectedScopeId, topRightScopeReady])

  const handleOpenCortexMax = useCallback(() => {
    setCortexMaxOpen(true)
  }, [])

  const handleTrainBrain = useCallback(() => {
    dispatchBrainTrainModal({ scopeId: selectedScopeId })
  }, [selectedScopeId])

  const handleOpenCrystallize = useCallback(() => {
    setCrystallizeOpen(true)
  }, [])

  return {
    cortexMaxOpen,
    crystallizeOpen,
    handleOpenCortexMax,
    handleOpenCrystallize,
    handleTrainBrain,
    setCortexMaxOpen,
    setCrystallizeOpen,
  }
}
