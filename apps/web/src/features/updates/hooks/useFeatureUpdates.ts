'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureUpdate } from '@/features/updates/types'
import { FEATURE_UPDATES_LAST_SEEN_KEY } from '@/features/updates/types'

type FeatureUpdatesApiResponse = { updates?: FeatureUpdate[]; error?: string }

const CACHE_KEY = 'vibey-feature-updates-cache'

function readCache(): FeatureUpdate[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FeatureUpdate[]
  } catch {
    return null
  }
}

function writeCache(data: FeatureUpdate[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* quota exceeded — ignore, next visit fetches fresh */
  }
}

export function useFeatureUpdates() {
  const [updates, setUpdates] = useState<FeatureUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lastSeenTick, setLastSeenTick] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  const fetchUpdates = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const res = await fetch('/api/feature-updates')
    const json = (await res.json()) as FeatureUpdatesApiResponse
    if (!res.ok) {
      setFetchError(json.error ?? res.statusText)
      setUpdates([])
      setLoading(false)
      return
    }
    const rows = json.updates ?? []
    setUpdates(rows)
    writeCache(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached && cached.length > 0) {
      setUpdates(cached)
    } else {
      void fetchUpdates()
    }
    setHydrated(true)
  }, [fetchUpdates])

  const latestCreatedAt = useMemo(() => {
    if (!updates.length) return null
    const first = updates[0]
    if (!first) return null
    return updates.reduce(
      (max, u) => (new Date(u.created_at) > new Date(max) ? u.created_at : max),
      first.created_at,
    )
  }, [updates])

  const hasUnread = useMemo(() => {
    if (!hydrated) return false
    if (!latestCreatedAt) return false
    const raw = localStorage.getItem(FEATURE_UPDATES_LAST_SEEN_KEY)
    if (!raw) return true
    return new Date(raw) < new Date(latestCreatedAt)
  }, [hydrated, updates, lastSeenTick, latestCreatedAt])

  const markAsSeen = useCallback(() => {
    if (!latestCreatedAt || typeof window === 'undefined') return
    localStorage.setItem(FEATURE_UPDATES_LAST_SEEN_KEY, latestCreatedAt)
    setLastSeenTick((t) => t + 1)
  }, [latestCreatedAt])

  return {
    updates,
    loading,
    fetchError,
    refetch: fetchUpdates,
    hasUnread,
    markAsSeen,
  }
}
