'use client'

import { create } from 'zustand'

export type ResearchSection = 'people' | 'topic' | 'favorites'

interface ResearchNavStore {
  byViewKey: Record<string, ResearchSection>
  setSection: (viewKey: string, section: ResearchSection) => void
}

export const useResearchNavStore = create<ResearchNavStore>((set) => ({
  byViewKey: {},
  setSection: (viewKey, section) =>
    set((state) => ({
      byViewKey: { ...state.byViewKey, [viewKey]: section },
    })),
}))

export function researchViewKey(spaceId: string, viewId: string): string {
  return `${spaceId}:${viewId}`
}
