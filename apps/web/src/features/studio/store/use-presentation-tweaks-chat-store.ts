'use client'

import { create } from 'zustand'
import type { PresentationBundle } from '../types'

type PresentationTweaksSession = {
  presentationId: string
  presentationName: string
}

interface PresentationTweaksChatState {
  session: PresentationTweaksSession | null
  tweaksChatActive: boolean
  bundle: PresentationBundle | null
  registerSession: (session: PresentationTweaksSession) => void
  clearSession: () => void
  setTweaksChatActive: (active: boolean) => void
  setBundle: (bundle: PresentationBundle | null) => void
}

export const usePresentationTweaksChatStore = create<PresentationTweaksChatState>()((set) => ({
  session: null,
  tweaksChatActive: false,
  bundle: null,

  registerSession: (session) =>
    set((state) => {
      if (state.session?.presentationId === session.presentationId) {
        return {
          session: {
            presentationId: session.presentationId,
            presentationName: session.presentationName,
          },
        }
      }
      return {
        session,
        bundle: null,
        tweaksChatActive: false,
      }
    }),

  clearSession: () =>
    set({
      session: null,
      bundle: null,
      tweaksChatActive: false,
    }),

  setTweaksChatActive: (active) => set({ tweaksChatActive: active }),

  setBundle: (bundle) => set({ bundle }),
}))
