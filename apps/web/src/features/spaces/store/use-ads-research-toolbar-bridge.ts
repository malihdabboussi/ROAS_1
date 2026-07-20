'use client'

import { create } from 'zustand'

export interface AdsResearchToolbarBridge {
  panelKey: string
  canRefreshSaved: boolean
  refreshingSaved: boolean
  refreshSavedSearch: () => void
}

export type AdsResearchSurface = 'runs' | 'library'

interface AdsResearchToolbarBridgeStore {
  bridge: AdsResearchToolbarBridge | null
  surface: AdsResearchSurface
  register: (bridge: AdsResearchToolbarBridge) => void
  clear: (panelKey: string) => void
  setSurface: (surface: AdsResearchSurface) => void
}

export const useAdsResearchToolbarBridgeStore = create<AdsResearchToolbarBridgeStore>(
  (set, get) => ({
    bridge: null,
    surface: 'runs',
    register: (bridge) => set({ bridge }),
    clear: (panelKey) => {
      if (get().bridge?.panelKey === panelKey) set({ bridge: null })
    },
    setSurface: (surface) => set({ surface }),
  }),
)
