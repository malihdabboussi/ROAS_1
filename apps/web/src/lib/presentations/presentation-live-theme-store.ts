'use client'

import { create } from 'zustand'

interface PresentationLiveThemeState {
  presentationId: string | null
  liveStyleNonce: number
  liveStyles: Record<string, string> | null
  liveThemeCss: string | null
  liveThemeFontsUrl: string | null
  liveThemeNonce: number
  bundleReloadNonce: number
  activatePresentationPreview: (presentationId: string) => void
  deactivatePresentationPreview: () => void
  setPresentationLiveStyles: (styles: Record<string, string> | null) => void
  setPresentationLiveThemeCss: (css: string | null, fontsUrl?: string | null) => void
  bumpPresentationBundleReload: () => void
}

export const usePresentationLiveThemeStore = create<PresentationLiveThemeState>()((set) => ({
  presentationId: null,
  liveStyleNonce: 0,
  liveStyles: null,
  liveThemeCss: null,
  liveThemeFontsUrl: null,
  liveThemeNonce: 0,
  bundleReloadNonce: 0,

  activatePresentationPreview: (presentationId) =>
    set({
      presentationId,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    }),

  deactivatePresentationPreview: () =>
    set({
      presentationId: null,
      liveStyleNonce: 0,
      liveStyles: null,
      liveThemeCss: null,
      liveThemeFontsUrl: null,
      liveThemeNonce: 0,
      bundleReloadNonce: 0,
    }),

  setPresentationLiveStyles: (styles) =>
    set((state) => ({
      liveStyles: styles,
      liveStyleNonce: state.liveStyleNonce + 1,
    })),

  setPresentationLiveThemeCss: (css, fontsUrl = null) =>
    set((state) => ({
      liveThemeCss: css,
      liveThemeFontsUrl: fontsUrl,
      liveThemeNonce: state.liveThemeNonce + 1,
    })),

  bumpPresentationBundleReload: () =>
    set((state) => ({
      bundleReloadNonce: state.bundleReloadNonce + 1,
    })),
}))
