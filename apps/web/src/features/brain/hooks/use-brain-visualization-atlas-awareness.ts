'use client'

import { useCallback } from 'react'
import type { ReportingDateRangeInput } from '@/lib/reporting'
import { brainDateRangeSummary } from '../components/BrainCreatedAtRangeDropdown'
import {
  buildBrainScopeAtlasAwarenessContext,
  type BrainScopeAwarenessOption,
} from '../lib/brain-visualization-helpers'
import type { BrainHealthData, BrainMemory } from '../types'

type UseBrainVisualizationAtlasAwarenessInput = {
  activeLoading: boolean
  brainDateFilterActive: boolean
  brainDateRange: ReportingDateRangeInput
  connectedNodeCount: number
  cortexMaxOpen: boolean
  crystallizeOpen: boolean
  experiencesOnly: boolean
  healthData: BrainHealthData | null
  memoryPanelOpen: boolean
  queueJobs: Array<{ status?: string | null; type?: string | null }>
  searchInput: string
  searchLoading: boolean
  searchQuery: string
  searchResultsCount: number
  selectedNode: BrainMemory | null
  selectedScope: BrainScopeAwarenessOption | undefined
  statsHealthForBar: BrainHealthData | null
  topRightScopeReady: boolean
  voiceSessionOpen: boolean
}

export function useBrainVisualizationAtlasAwareness({
  activeLoading,
  brainDateFilterActive,
  brainDateRange,
  connectedNodeCount,
  cortexMaxOpen,
  crystallizeOpen,
  experiencesOnly,
  healthData,
  memoryPanelOpen,
  queueJobs,
  searchInput,
  searchLoading,
  searchQuery,
  searchResultsCount,
  selectedNode,
  selectedScope,
  statsHealthForBar,
  topRightScopeReady,
  voiceSessionOpen,
}: UseBrainVisualizationAtlasAwarenessInput) {
  return useCallback(
    () =>
      buildBrainScopeAtlasAwarenessContext({
        selectedScope,
        topRightScopeReady,
        activeLoading,
        healthData,
        statsHealthForBar,
        brainDateRangeLabel: brainDateFilterActive ? brainDateRangeSummary(brainDateRange) : null,
        brainDateFilterActive,
        experiencesOnly,
        searchQuery,
        searchInput,
        searchResultsCount,
        searchLoading,
        selectedNode,
        connectedNodeCount,
        queueJobs,
        voiceSessionOpen,
        memoryPanelOpen,
        cortexMaxOpen,
        crystallizeOpen,
      }),
    [
      activeLoading,
      brainDateFilterActive,
      brainDateRange,
      connectedNodeCount,
      cortexMaxOpen,
      crystallizeOpen,
      experiencesOnly,
      healthData,
      memoryPanelOpen,
      queueJobs,
      searchInput,
      searchLoading,
      searchQuery,
      searchResultsCount,
      selectedNode,
      selectedScope,
      statsHealthForBar,
      topRightScopeReady,
      voiceSessionOpen,
    ],
  )
}
