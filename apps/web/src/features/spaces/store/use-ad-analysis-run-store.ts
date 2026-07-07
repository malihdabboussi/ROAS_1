import { create } from 'zustand'
import { breakdownAd, type AdSearchResultItem } from '../services/ads-research.service'

type AdAnalysisRunState = { status: 'running' } | { status: 'error'; error: string }

interface AdAnalysisRunStore {
  runs: Record<string, AdAnalysisRunState>
  /**
   * Runs the breakdown in module scope so closing the analysis panel mid-run
   * doesn't lose the result: `onDone` persists the patch (snapshot / space
   * item) whether or not the panel is still mounted, and a reopened panel sees
   * `running` while the run is in flight.
   */
  startBreakdown: (
    key: string,
    spaceId: string,
    ad: AdSearchResultItem,
    onDone: (patch: Partial<AdSearchResultItem>) => void | Promise<void>,
  ) => void
  clearError: (key: string) => void
}

export function adAnalysisRunKey(spaceId: string, ad: AdSearchResultItem): string {
  return `${spaceId}:${ad.platform}:${ad.ad_id}`
}

export const useAdAnalysisRunStore = create<AdAnalysisRunStore>((set, get) => ({
  runs: {},

  startBreakdown: (key, spaceId, ad, onDone) => {
    if (get().runs[key]?.status === 'running') return
    set((s) => ({ runs: { ...s.runs, [key]: { status: 'running' } } }))
    void (async () => {
      try {
        const patch = await breakdownAd(spaceId, ad.platform, ad)
        await onDone(patch)
        set((s) => {
          const next = { ...s.runs }
          delete next[key]
          return { runs: next }
        })
      } catch (err) {
        // Surface the server's reason (e.g. "Google hides this creative's
        // content") instead of a generic retry message.
        const message =
          err instanceof Error && err.message && !err.message.startsWith('Backend error')
            ? err.message
            : "Analysis didn't go through — try again."
        set((s) => ({
          runs: { ...s.runs, [key]: { status: 'error', error: message } },
        }))
      }
    })()
  },

  clearError: (key) => {
    set((s) => {
      if (s.runs[key]?.status !== 'error') return s
      const next = { ...s.runs }
      delete next[key]
      return { runs: next }
    })
  },
}))
