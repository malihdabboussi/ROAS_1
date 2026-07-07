'use client'

import { create } from 'zustand'
import type { FunnelPageBundle } from '../services/artifact-preview.service'

type FunnelTweaksSession = {
  funnelId: string
  funnelName: string
}

export type FunnelTweaksContext = {
  themeId: string | null
  metadata: Record<string, unknown> | null
}

interface FunnelTweaksChatState {
  session: FunnelTweaksSession | null
  tweaksChatActive: boolean
  bundle: FunnelPageBundle | null
  tweaksContext: FunnelTweaksContext | null
  registerSession: (session: FunnelTweaksSession) => void
  clearSession: () => void
  setTweaksChatActive: (active: boolean) => void
  setBundle: (bundle: FunnelPageBundle | null) => void
  setTweaksContext: (context: FunnelTweaksContext | null) => void
}

export const useFunnelTweaksChatStore = create<FunnelTweaksChatState>()((set) => ({
  session: null,
  tweaksChatActive: false,
  bundle: null,
  tweaksContext: null,

  registerSession: (session) =>
    set((state) => {
      if (state.session?.funnelId === session.funnelId) {
        return {
          session: {
            funnelId: session.funnelId,
            funnelName: session.funnelName,
          },
        }
      }
      return {
        session,
        bundle: null,
        tweaksContext: null,
        tweaksChatActive: false,
      }
    }),

  clearSession: () =>
    set({
      session: null,
      bundle: null,
      tweaksContext: null,
      tweaksChatActive: false,
    }),

  setTweaksChatActive: (active) => set({ tweaksChatActive: active }),

  setBundle: (bundle) => set({ bundle }),

  setTweaksContext: (context) => set({ tweaksContext: context }),
}))
