'use client'

import { useEffect, useState } from 'react'
import {
  backendOptionsForHomeFeed,
  homeFeedCacheScopeKey,
  type HomeFeedScopeState,
} from '@/lib/home/home-feed-scope'
import { createCachedResource } from '@/lib/cache/cached-resource'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org/org-context-store'
import { createClient } from '@/lib/supabase/client'
import { normalizeSpaceLegacyViews } from '../lib/view-customization-merge'
import { fetchSharedWithMe, fetchSpaces, fetchSpacesPage } from '../services/spaces.service'
import type { Space } from '../types'

const SPACES_REALTIME_RELOAD_DEBOUNCE_MS = 750
const SPACES_REALTIME_TABLES = ['spaces', 'space_shares', 'space_view_shares'] as const

let spacesRealtimeChannelSeq = 0

function mergeSpaces(ownedSpaces: Space[], sharedSpaces: Space[]): Space[] {
  const spacesById = new Map<string, Space>()
  for (const space of ownedSpaces) spacesById.set(space.id, space)
  for (const space of sharedSpaces) {
    if (!spacesById.has(space.id)) spacesById.set(space.id, space)
  }
  return [...spacesById.values()]
}

function getSpacesContextKey(): string {
  return useOrgStore.getState().activeOrgId ?? 'personal'
}

let spacesCacheContextKey: string | null = null
let spacesNextCursor: string | null = null
let spacesLoadingMore = false
const spacesPaginationListeners = new Set<() => void>()

function notifySpacesPagination() {
  for (const listener of spacesPaginationListeners) listener()
}

const spacesResource = createCachedResource<Space[]>(
  async () => {
    const orgState = useOrgStore.getState()
    const contextKey = getSpacesContextKey()
    const inOrgContext = orgState.isOrgContext()
    const [ownedPage, sharedSpaces] = await Promise.all([
      fetchSpacesPage({ limit: 100 }),
      inOrgContext ? fetchSharedWithMe().catch(() => []) : Promise.resolve<Space[]>([]),
    ])
    spacesNextCursor = ownedPage.nextCursor
    notifySpacesPagination()
    const merged = mergeSpaces(ownedPage.items, sharedSpaces).map(normalizeSpaceLegacyViews)
    spacesCacheContextKey = contextKey
    return merged
  },
  { ttlMs: 60_000 },
)

export const cachedSpaces = {
  invalidate: () => {
    spacesCacheContextKey = null
    spacesNextCursor = null
    spacesLoadingMore = false
    notifySpacesPagination()
    spacesResource.invalidate()
  },
  reload: () => spacesResource.reload(),
  peek: () => (spacesCacheContextKey === getSpacesContextKey() ? spacesResource.peek() : undefined),
  hasMore: () => spacesCacheContextKey === getSpacesContextKey() && spacesNextCursor !== null,
  loadingMore: () => spacesLoadingMore,
  subscribePagination: (listener: () => void) => {
    spacesPaginationListeners.add(listener)
    return () => {
      spacesPaginationListeners.delete(listener)
    }
  },
  loadMore: async () => {
    if (spacesCacheContextKey !== getSpacesContextKey()) {
      return spacesResource.reload()
    }
    if (!spacesNextCursor || spacesLoadingMore) {
      return spacesResource.peek() ?? []
    }

    spacesLoadingMore = true
    notifySpacesPagination()
    try {
      const page = await fetchSpacesPage({ limit: 100, cursor: spacesNextCursor })
      spacesNextCursor = page.nextCursor
      const nextSpaces = page.items.map(normalizeSpaceLegacyViews)
      spacesResource.mutate((prev) => mergeSpaces(prev ?? [], nextSpaces))
      return spacesResource.peek() ?? []
    } finally {
      spacesLoadingMore = false
      notifySpacesPagination()
    }
  },
  mutate: (next: Space[] | ((prev: Space[] | undefined) => Space[])) => {
    spacesCacheContextKey = getSpacesContextKey()
    spacesResource.mutate(next)
  },
}

/**
 * Spaces list for a home-card feed scope.
 *
 * Workspace scope reuses the shared `cachedSpaces` resource (the sidebar
 * already populates it — zero extra requests); other scopes go through a
 * deduped 60s `cachedFetch` keyed by scope + effective org header so all
 * home cards asking for the same scope share one request.
 */
export function fetchSpacesForHomeScope(scope: HomeFeedScopeState): Promise<Space[]> {
  if (scope.feedScope === 'workspace') {
    const cached = cachedSpaces.peek()
    return cached ? Promise.resolve(cached) : cachedSpaces.reload()
  }
  return cachedFetch(
    `home:spaces:${homeFeedCacheScopeKey(scope.feedScope, scope.orgId)}`,
    () => fetchSpaces({ limit: 200 }, backendOptionsForHomeFeed(scope.feedScope, scope.orgId)),
    { ttlMs: 60_000 },
  )
}

export function useCachedSpaces(enabled = true) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const contextKey = activeOrgId ?? 'personal'
  const hasCurrentContext = spacesCacheContextKey === contextKey
  const result = spacesResource.use({ enabled })
  const [, setPaginationTick] = useState(0)

  useEffect(() => {
    if (!enabled || hasCurrentContext) return
    spacesResource.invalidate()
    void spacesResource.reload()
  }, [enabled, hasCurrentContext, contextKey])

  useEffect(() => {
    if (!enabled) return undefined
    return cachedSpaces.subscribePagination(() => setPaginationTick((tick) => tick + 1))
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const supabase = createClient()
    let reloadTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void cachedSpaces.reload().catch(() => undefined)
      }, SPACES_REALTIME_RELOAD_DEBOUNCE_MS)
    }

    spacesRealtimeChannelSeq += 1
    let channel = supabase.channel(`spaces-cache:${contextKey}:${spacesRealtimeChannelSeq}`)
    for (const table of SPACES_REALTIME_TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload)
    }

    const subscribed = channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(
          `[Realtime] spaces cache channel disconnected for ${contextKey}`,
          err instanceof Error ? err.message : err,
        )
      }
    })

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(subscribed)
    }
  }, [enabled, contextKey])

  return {
    ...result,
    data: hasCurrentContext ? result.data : undefined,
    loading: enabled && !hasCurrentContext ? true : result.loading,
    hasMore: hasCurrentContext && cachedSpaces.hasMore(),
    loadingMore: hasCurrentContext && cachedSpaces.loadingMore(),
    loadMore: cachedSpaces.loadMore,
  }
}
