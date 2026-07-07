'use client'

import { create } from 'zustand'
import type { SocialResearchConfig } from '../types/space-schema'

type SortBy = NonNullable<SocialResearchConfig['sort_by']>
type SortDir = NonNullable<SocialResearchConfig['sort_dir']>

export interface ResearchTopicToolbarBridge {
  viewKey: string
  sortBy: SortBy
  sortDir: SortDir
  /** Live topic drafts stay false until the user picks a sort; saved snapshots are always true. */
  sortApplied: boolean
  minOutlier: number
  hasResults: boolean
  isSavedSnapshot: boolean
  canRefreshSaved: boolean
  refreshingSaved: boolean
  setSortBy: (sortBy: SortBy) => void
  setSortDir: (sortDir: SortDir) => void
  setMinOutlier: (value: number) => void
  refreshSavedSearch: () => void
}

interface ResearchTopicToolbarBridgeStore {
  bridge: ResearchTopicToolbarBridge | null
  register: (bridge: ResearchTopicToolbarBridge) => void
  clear: (viewKey: string) => void
}

export const useResearchTopicToolbarBridgeStore = create<ResearchTopicToolbarBridgeStore>(
  (set, get) => ({
    bridge: null,
    register: (bridge) => set({ bridge }),
    clear: (viewKey) => {
      if (get().bridge?.viewKey === viewKey) set({ bridge: null })
    },
  }),
)
