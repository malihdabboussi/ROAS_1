'use client'

import { create } from 'zustand'
import {
  fetchBeliefPatterns,
  fetchBrainGraph,
  fetchBrainHealth,
  fetchCustomerAvatars,
  fetchPerspectives,
} from '../services/brain.service'
import { reportBrainError } from '../lib/report-brain-error'
import type {
  BeliefPattern,
  BrainGraphData,
  BrainHealthData,
  BrainMemory,
  CustomerAvatar,
  Perspective,
} from '../types'

// ============================================================================
// Brain Store
// ============================================================================

let latestGraphRequestId = 0
let latestHealthRequestId = 0
let latestCognitionRequestId = 0
let latestAvatarsRequestId = 0
const GRAPH_CACHE_TTL_MS = 60_000
const FULL_LOAD_LIMIT = 10_000

function scopeCacheKey(agentId?: string, brainId?: string) {
  return `${agentId ?? ''}:${brainId ?? ''}`
}

/**
 * True when a graph payload is as complete as it can get — either the backend
 * reports `stats.nodes_truncated: false` (the load was not capped by its
 * `limit`), or `stats.node_window_capped: true` (the server clamped the window
 * to its maximum, so a larger request would return the same nodes). Undefined
 * (older backend) is treated as possibly-truncated so the full follow-up fetch
 * still fires (pre-existing behavior).
 */
export function isCompleteGraph(data: BrainGraphData | null | undefined): boolean {
  return data?.stats?.nodes_truncated === false || data?.stats?.node_window_capped === true
}

/**
 * Per-scope SWR snapshots (patterns.md §3). The store itself only holds the
 * ACTIVE scope's data; these maps keep the last fetched graph/health for every
 * scope visited this session so A→B→A switches paint instantly and only
 * revalidate in the background. Entries are written on fetch success, deleted
 * on revalidation failure, and cleared by `reset()` (org switch / sign-out).
 */
const graphSnapshotByScope = new Map<string, { graphData: BrainGraphData; fetchedAt: number }>()
const healthSnapshotByScope = new Map<string, BrainHealthData>()

interface BrainState {
  // Data
  graphData: BrainGraphData | null
  healthData: BrainHealthData | null
  beliefs: BeliefPattern[]
  perspectives: Perspective[]
  customerAvatars: CustomerAvatar[]
  selectedNode: BrainMemory | null
  graphCacheKey: string | null
  graphDataFetchedAt: number

  // UI
  loading: boolean
  error: string | null
  searchQuery: string
  memoryPanelOpen: boolean

  // Actions
  loadGraph: (agentId?: string, brainId?: string) => Promise<void>
  loadHealth: (agentId?: string, brainId?: string) => Promise<void>
  loadCognition: (brainId?: string | null) => Promise<void>
  loadCustomerAvatars: (brainId: string) => Promise<void>
  clearActiveScope: () => void
  selectNode: (node: BrainMemory | null) => void
  setSearchQuery: (query: string) => void
  setMemoryPanelOpen: (open: boolean) => void
  reset: () => void
}

export const useBrainStore = create<BrainState>((set, get) => ({
  graphData: null,
  healthData: null,
  beliefs: [],
  perspectives: [],
  customerAvatars: [],
  selectedNode: null,
  graphCacheKey: null,
  graphDataFetchedAt: 0,
  loading: false,
  error: null,
  searchQuery: '',
  memoryPanelOpen: false,

  loadGraph: async (agentId?: string, brainId?: string) => {
    const requestId = ++latestGraphRequestId
    const cacheKey = scopeCacheKey(agentId, brainId)
    const state = get()
    const isSameScope = state.graphCacheKey === cacheKey
    const cacheAge = Date.now() - state.graphDataFetchedAt

    if (isSameScope && state.graphData && cacheAge < GRAPH_CACHE_TTL_MS) {
      set({ loading: false })
      // Fresh AND complete — nothing more the full load could add.
      if (isCompleteGraph(state.graphData)) return
      fetchBrainGraph(agentId, brainId, FULL_LOAD_LIMIT)
        .then((data) => {
          graphSnapshotByScope.set(cacheKey, { graphData: data, fetchedAt: Date.now() })
          if (latestGraphRequestId === requestId) {
            set({ graphData: data, graphDataFetchedAt: Date.now() })
          }
        })
        .catch(() => {})
      return
    }

    // Scope switch with a snapshot: restore synchronously (instant paint, no
    // loading gate), then revalidate the full graph in the background.
    const snapshot = !isSameScope ? graphSnapshotByScope.get(cacheKey) : undefined
    if (snapshot) {
      set({
        loading: false,
        error: null,
        graphCacheKey: cacheKey,
        graphData: snapshot.graphData,
        graphDataFetchedAt: snapshot.fetchedAt,
        healthData: healthSnapshotByScope.get(cacheKey) ?? null,
        customerAvatars: [],
      })
      // Revalidate in the background — a complete snapshot only needs the
      // default window (cheap); a truncated one re-requests the full graph.
      const revalidateLimit = isCompleteGraph(snapshot.graphData) ? undefined : FULL_LOAD_LIMIT
      fetchBrainGraph(agentId, brainId, revalidateLimit)
        .then((data) => {
          graphSnapshotByScope.set(cacheKey, { graphData: data, fetchedAt: Date.now() })
          if (latestGraphRequestId === requestId) {
            set({ graphData: data, graphDataFetchedAt: Date.now() })
          }
          // The scope grew past the default window since the snapshot — fetch the rest.
          if (revalidateLimit === undefined && !isCompleteGraph(data)) {
            fetchBrainGraph(agentId, brainId, FULL_LOAD_LIMIT)
              .then((fullData) => {
                graphSnapshotByScope.set(cacheKey, { graphData: fullData, fetchedAt: Date.now() })
                if (latestGraphRequestId === requestId) {
                  set({ graphData: fullData, graphDataFetchedAt: Date.now() })
                }
              })
              .catch(() => {})
          }
        })
        .catch(() => {
          // Don't resurrect stale data on the next switch.
          graphSnapshotByScope.delete(cacheKey)
        })
      return
    }

    set({
      loading: true,
      error: null,
      graphCacheKey: cacheKey,
      graphData: null,
      healthData: null,
      customerAvatars: [],
    })
    try {
      const data = await fetchBrainGraph(agentId, brainId)
      graphSnapshotByScope.set(cacheKey, { graphData: data, fetchedAt: Date.now() })
      if (requestId !== latestGraphRequestId) return
      set({ graphData: data, loading: false, graphDataFetchedAt: Date.now() })

      // Only issue the full follow-up when the first window was actually
      // capped — small brains load in a single request.
      if (!isCompleteGraph(data)) {
        fetchBrainGraph(agentId, brainId, FULL_LOAD_LIMIT)
          .then((fullData) => {
            if (fullData.nodes.length > data.nodes.length) {
              graphSnapshotByScope.set(cacheKey, { graphData: fullData, fetchedAt: Date.now() })
            }
            if (latestGraphRequestId !== requestId) return
            if (fullData.nodes.length > data.nodes.length) {
              set({ graphData: fullData, graphDataFetchedAt: Date.now() })
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      graphSnapshotByScope.delete(cacheKey)
      if (requestId !== latestGraphRequestId) return
      reportBrainError('graph_load_failed', err, { agentId, brainId })
      set({
        error: err instanceof Error ? err.message : 'Failed to load brain graph',
        loading: false,
      })
    }
  },

  loadHealth: async (agentId?: string, brainId?: string) => {
    const requestId = ++latestHealthRequestId
    const cacheKey = scopeCacheKey(agentId, brainId)
    try {
      const data = await fetchBrainHealth(agentId, brainId)
      healthSnapshotByScope.set(cacheKey, data)
      if (requestId !== latestHealthRequestId) return
      set({ healthData: data })
    } catch {
      // Health is non-critical, silently fail
    }
  },

  loadCognition: async (brainId?: string | null) => {
    const requestId = ++latestCognitionRequestId
    set({ beliefs: [], perspectives: [] })
    try {
      const [beliefs, perspectives] = await Promise.all([
        fetchBeliefPatterns(brainId ?? undefined).catch(() => [] as BeliefPattern[]),
        fetchPerspectives(brainId ?? undefined).catch(() => [] as Perspective[]),
      ])
      if (requestId !== latestCognitionRequestId) return
      set({ beliefs, perspectives })
    } catch {
      if (requestId !== latestCognitionRequestId) return
      set({ beliefs: [], perspectives: [] })
    }
  },

  loadCustomerAvatars: async (brainId: string) => {
    const requestId = ++latestAvatarsRequestId
    try {
      const avatars = await fetchCustomerAvatars(brainId)
      if (requestId !== latestAvatarsRequestId) return
      set({ customerAvatars: avatars })
    } catch {
      if (requestId !== latestAvatarsRequestId) return
      set({ customerAvatars: [] })
    }
  },

  clearActiveScope: () => {
    latestGraphRequestId += 1
    latestHealthRequestId += 1
    latestCognitionRequestId += 1
    latestAvatarsRequestId += 1
    set({
      graphData: null,
      healthData: null,
      beliefs: [],
      perspectives: [],
      customerAvatars: [],
      selectedNode: null,
      graphCacheKey: null,
      graphDataFetchedAt: 0,
      loading: false,
      error: null,
    })
  },

  selectNode: (node) => set({ selectedNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setMemoryPanelOpen: (open) => set({ memoryPanelOpen: open }),

  reset: () => {
    graphSnapshotByScope.clear()
    healthSnapshotByScope.clear()
    set({
      graphData: null,
      healthData: null,
      beliefs: [],
      perspectives: [],
      customerAvatars: [],
      selectedNode: null,
      graphCacheKey: null,
      graphDataFetchedAt: 0,
      loading: false,
      error: null,
      searchQuery: '',
      memoryPanelOpen: false,
    })
  },
}))
