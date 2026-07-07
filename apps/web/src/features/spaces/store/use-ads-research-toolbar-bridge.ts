'use client'

import { create } from 'zustand'

export interface AdsResearchToolbarBridge {
  panelKey: string
  canRefreshSaved: boolean
  refreshingSaved: boolean
  refreshSavedSearch: () => void
}

interface AdsResearchToolbarBridgeStore {
  bridge: AdsResearchToolbarBridge | null
  register: (bridge: AdsResearchToolbarBridge) => void
  clear: (panelKey: string) => void
}

export const useAdsResearchToolbarBridgeStore = create<AdsResearchToolbarBridgeStore>(
  (set, get) => ({
    bridge: null,
    register: (bridge) => set({ bridge }),
    clear: (panelKey) => {
      if (get().bridge?.panelKey === panelKey) set({ bridge: null })
    },
  }),
)
