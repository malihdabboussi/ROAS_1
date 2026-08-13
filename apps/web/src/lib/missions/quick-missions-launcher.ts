'use client'

import { create } from 'zustand'

type QuickMissionsLauncherState = {
  open: boolean
  playbookKey: string | null
  openLauncher: (playbookKey?: string) => void
  closeLauncher: () => void
}

export const useQuickMissionsLauncherStore = create<QuickMissionsLauncherState>((set) => ({
  open: false,
  playbookKey: null,
  openLauncher: (playbookKey) => set({ open: true, playbookKey: playbookKey ?? null }),
  closeLauncher: () => set({ open: false, playbookKey: null }),
}))

export function openQuickMissions(playbookKey?: string) {
  useQuickMissionsLauncherStore.getState().openLauncher(playbookKey)
}
