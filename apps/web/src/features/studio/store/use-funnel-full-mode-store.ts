'use client'

import { create } from 'zustand'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { FunnelEditMode } from '../types'
import { useFunnelCommentsChatStore } from './use-funnel-comments-chat-store'
import { useFunnelDesignChatStore } from './use-funnel-design-chat-store'
import { useFunnelTweaksChatStore } from './use-funnel-tweaks-chat-store'

interface FunnelFullModeState {
  funnelId: string | null
  mode: FunnelEditMode
  pagesOpen: boolean
  liveStyleNonce: number
  liveStyles: Record<string, string> | null
  liveThemeCss: string | null
  liveThemeFontsUrl: string | null
  liveThemeNonce: number
  bundleReloadNonce: number
  activate: (funnelId: string) => void
  deactivate: () => void
  setMode: (mode: FunnelEditMode) => void
  setPagesOpen: (open: boolean) => void
  togglePages: () => void
  setLiveStyles: (styles: Record<string, string> | null) => void
  setLiveThemeCss: (css: string | null, fontsUrl?: string | null) => void
  bumpBundleReload: () => void
}

export const useFunnelFullModeStore = create<FunnelFullModeState>()((set) => ({
  funnelId: null,
  mode: 'preview',
  pagesOpen: true,
  liveStyleNonce: 0,
  liveStyles: null,
  liveThemeCss: null,
  liveThemeFontsUrl: null,
  liveThemeNonce: 0,
  bundleReloadNonce: 0,

  activate: (funnelId) =>
    set({
      funnelId,
      mode: 'preview',
      pagesOpen: true,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    }),

  deactivate: () =>
    set({
      funnelId: null,
      mode: 'preview',
      pagesOpen: true,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    }),

  setMode: (mode) => {
    set({ mode })
    useFunnelCommentsChatStore.getState().setCommentsChatActive(mode === 'comments')
    useFunnelDesignChatStore.getState().setDesignChatActive(mode === 'edit')
    useFunnelTweaksChatStore.getState().setTweaksChatActive(mode === 'tweaks')
    if (mode === 'comments' || mode === 'edit' || mode === 'tweaks') {
      useSpacesStore.getState().setChatCollapsed(false)
    }
  },

  setPagesOpen: (open) => set({ pagesOpen: open }),

  togglePages: () => set((state) => ({ pagesOpen: !state.pagesOpen })),

  setLiveStyles: (styles) =>
    set((state) => ({
      liveStyles: styles,
      liveStyleNonce: state.liveStyleNonce + 1,
    })),

  setLiveThemeCss: (css, fontsUrl = null) => {
    set((state) => ({
      liveThemeCss: css,
      liveThemeFontsUrl: fontsUrl,
      liveThemeNonce: state.liveThemeNonce + 1,
    }))
  },

  bumpBundleReload: () =>
    set((state) => ({
      bundleReloadNonce: state.bundleReloadNonce + 1,
    })),
}))
