'use client'

import { create } from 'zustand'

export interface PreviewError {
  id: string
  message: string
  stack?: string
  source: 'validation' | 'runtime' | 'iframe'
  code?: string
  pageName?: string
  pageId?: string
  timestamp: number
  reported: boolean
}

interface PreviewErrorState {
  errors: PreviewError[]
  addError: (error: Omit<PreviewError, 'id' | 'timestamp' | 'reported'>) => void
  markAllReported: () => void
  clearErrors: () => void
  getUnreportedErrors: () => PreviewError[]
}

const MAX_ERRORS = 20
const DEDUP_WINDOW_MS = 5_000

export const usePreviewErrorStore = create<PreviewErrorState>()((set, get) => ({
  errors: [],

  addError: (error) =>
    set((state) => {
      const now = Date.now()
      const isDuplicate = state.errors.some(
        (e) =>
          e.message === error.message &&
          e.source === error.source &&
          now - e.timestamp < DEDUP_WINDOW_MS,
      )
      if (isDuplicate) return state

      const entry: PreviewError = {
        ...error,
        id: `pe-${now}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now,
        reported: false,
      }
      const next = [...state.errors, entry]
      if (next.length > MAX_ERRORS) next.shift()
      return { errors: next }
    }),

  markAllReported: () =>
    set((state) => ({
      errors: state.errors.map((e) => (e.reported ? e : { ...e, reported: true })),
    })),

  clearErrors: () => set({ errors: [] }),

  getUnreportedErrors: () => get().errors.filter((e) => !e.reported),
}))
