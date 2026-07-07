'use client'

import { create } from 'zustand'
import { requestPresentationChatOpen } from '@/lib/presentations/presentation-chat-events'
import { usePresentationLiveThemeStore } from '@/lib/presentations/presentation-live-theme-store'
import type { PresentationEditMode } from '../types'
import { usePresentationCommentsChatStore } from './use-presentation-comments-chat-store'
import { usePresentationDesignChatStore } from './use-presentation-design-chat-store'
import { usePresentationTweaksChatStore } from './use-presentation-tweaks-chat-store'

interface PresentationFullModeState {
  presentationId: string | null
  mode: PresentationEditMode
  thumbnailsOpen: boolean
  liveStyleNonce: number
  liveStyles: Record<string, string> | null
  liveThemeCss: string | null
  liveThemeFontsUrl: string | null
  liveThemeNonce: number
  bundleReloadNonce: number
  activate: (presentationId: string) => void
  deactivate: () => void
  setMode: (mode: PresentationEditMode) => void
  setThumbnailsOpen: (open: boolean) => void
  toggleThumbnails: () => void
  setLiveStyles: (styles: Record<string, string> | null) => void
  setLiveThemeCss: (css: string | null, fontsUrl?: string | null) => void
  bumpBundleReload: () => void
}

export const usePresentationFullModeStore = create<PresentationFullModeState>()((set) => ({
  presentationId: null,
  mode: 'preview',
  thumbnailsOpen: true,
  liveStyleNonce: 0,
  liveStyles: null,
  liveThemeCss: null,
  liveThemeFontsUrl: null,
  liveThemeNonce: 0,
  bundleReloadNonce: 0,

  activate: (presentationId) => {
    usePresentationLiveThemeStore.getState().activatePresentationPreview(presentationId)
    set({
      presentationId,
      mode: 'preview',
      thumbnailsOpen: true,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    })
  },

  deactivate: () => {
    usePresentationLiveThemeStore.getState().deactivatePresentationPreview()
    set({
      presentationId: null,
      mode: 'preview',
      thumbnailsOpen: true,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    })
  },

  setMode: (mode) => {
    set({ mode })
    usePresentationCommentsChatStore.getState().setCommentsChatActive(mode === 'comments')
    usePresentationDesignChatStore.getState().setDesignChatActive(mode === 'edit')
    usePresentationTweaksChatStore.getState().setTweaksChatActive(mode === 'tweaks')
    if (mode === 'comments' || mode === 'edit' || mode === 'tweaks') {
      requestPresentationChatOpen()
    }
  },

  setThumbnailsOpen: (open) => set({ thumbnailsOpen: open }),

  toggleThumbnails: () => set((state) => ({ thumbnailsOpen: !state.thumbnailsOpen })),

  setLiveStyles: (styles) => {
    usePresentationLiveThemeStore.getState().setPresentationLiveStyles(styles)
    set((state) => ({
      liveStyles: styles,
      liveStyleNonce: state.liveStyleNonce + 1,
    }))
  },

  setLiveThemeCss: (css, fontsUrl = null) => {
    usePresentationLiveThemeStore.getState().setPresentationLiveThemeCss(css, fontsUrl)
    set((state) => ({
      liveThemeCss: css,
      liveThemeFontsUrl: fontsUrl,
      liveThemeNonce: state.liveThemeNonce + 1,
    }))
  },

  bumpBundleReload: () => {
    usePresentationLiveThemeStore.getState().bumpPresentationBundleReload()
    set((state) => ({
      bundleReloadNonce: state.bundleReloadNonce + 1,
    }))
  },
}))
