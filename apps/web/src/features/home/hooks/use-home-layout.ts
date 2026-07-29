'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_STORAGE_KEY,
  HOME_LAYOUT_VERSION,
  homeLayoutNeedsMigration,
  homeLayoutStorageKey,
  parseHomeLayout,
} from '../config/home-cards.config'
import { fetchHomeLayoutPreference, saveHomeLayoutPreference } from '../services/home-layout-api'
import type {
  HomeCardGridRows,
  HomeCardGridSize,
  HomeCardId,
  HomeLayoutState,
} from '../types/home-cards'

const SAVE_DEBOUNCE_MS = 400

function defaultHomeLayoutState(): HomeLayoutState {
  return {
    ...DEFAULT_HOME_LAYOUT,
    cardIds: [...DEFAULT_HOME_LAYOUT.cardIds],
    cardSizes: { ...DEFAULT_HOME_LAYOUT.cardSizes },
    cardRows: { ...DEFAULT_HOME_LAYOUT.cardRows },
  }
}

function readStorageLayout(
  key: string,
): { layout: HomeLayoutState; needsMigration: boolean } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return {
      layout: parseHomeLayout(parsed),
      needsMigration: homeLayoutNeedsMigration(parsed),
    }
  } catch {
    return null
  }
}

function writeStorageLayout(key: string, layout: HomeLayoutState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(layout))
}

function removeStorageKey(key: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function layoutsEqual(a: HomeLayoutState, b: HomeLayoutState): boolean {
  if (a.version !== b.version) return false
  if (a.cardIds.length !== b.cardIds.length) return false
  if (a.cardIds.some((id, index) => id !== b.cardIds[index])) return false
  const aSizes = a.cardSizes ?? {}
  const bSizes = b.cardSizes ?? {}
  const keys = new Set([...Object.keys(aSizes), ...Object.keys(bSizes)])
  for (const key of keys) {
    const id = key as HomeCardId
    if ((aSizes[id] ?? 'half') !== (bSizes[id] ?? 'half')) return false
  }
  const aRows = a.cardRows ?? {}
  const bRows = b.cardRows ?? {}
  const rowKeys = new Set([...Object.keys(aRows), ...Object.keys(bRows)])
  for (const key of rowKeys) {
    const id = key as HomeCardId
    if ((aRows[id] ?? 1) !== (bRows[id] ?? 1)) return false
  }
  return true
}

export function useHomeLayout() {
  const [layout, setLayout] = useState<HomeLayoutState>(defaultHomeLayoutState)
  const [editing, setEditing] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestLayoutRef = useRef<HomeLayoutState>(defaultHomeLayoutState())
  const storageKeyRef = useRef<string | null>(null)

  const saveLocalLayout = useCallback((next: HomeLayoutState) => {
    const key = storageKeyRef.current
    if (!key) return
    writeStorageLayout(key, next)
  }, [])

  const queueServerSave = useCallback((next: HomeLayoutState) => {
    latestLayoutRef.current = next
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void saveHomeLayoutPreference(latestLayoutRef.current).catch(() => {
        // Keep local cache; next successful edit retries server sync.
      })
    }, SAVE_DEBOUNCE_MS)
  }, [])

  const persist = useCallback(
    (next: HomeLayoutState) => {
      setLayout(next)
      latestLayoutRef.current = next
      saveLocalLayout(next)
      queueServerSave(next)
    },
    [queueServerSave, saveLocalLayout],
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser()
      if (cancelled || !user?.id) return

      const userKey = homeLayoutStorageKey(user.id)
      storageKeyRef.current = userKey

      const userScopedResult = readStorageLayout(userKey)
      const legacyResult = readStorageLayout(HOME_LAYOUT_STORAGE_KEY)
      const userScoped = userScopedResult?.layout ?? null
      const legacy = legacyResult?.layout ?? null
      const local = userScoped ?? legacy ?? defaultHomeLayoutState()
      setLayout(local)
      latestLayoutRef.current = local

      try {
        const remoteRaw = await fetchHomeLayoutPreference()
        if (cancelled) return

        if (remoteRaw != null) {
          const remote = parseHomeLayout(remoteRaw)
          setLayout(remote)
          latestLayoutRef.current = remote
          writeStorageLayout(userKey, remote)
          removeStorageKey(HOME_LAYOUT_STORAGE_KEY)
          if (homeLayoutNeedsMigration(remoteRaw)) {
            await saveHomeLayoutPreference(remote)
          }
          return
        }

        // Migrate only this user's scoped cache (or one-shot legacy key) when server is empty.
        const migrateSource = userScoped ?? legacy
        const sourceNeedsMigration =
          userScopedResult?.needsMigration ?? legacyResult?.needsMigration ?? false
        if (
          migrateSource &&
          (sourceNeedsMigration || !layoutsEqual(migrateSource, defaultHomeLayoutState()))
        ) {
          await saveHomeLayoutPreference(migrateSource)
          if (cancelled) return
          writeStorageLayout(userKey, migrateSource)
          removeStorageKey(HOME_LAYOUT_STORAGE_KEY)
        } else if (legacy) {
          // Drop unowned legacy cache so it cannot attach to the next account.
          removeStorageKey(HOME_LAYOUT_STORAGE_KEY)
        }
      } catch {
        // Offline / API failure — keep whatever local layout we already applied.
        if (userScoped) writeStorageLayout(userKey, userScoped)
      }
    })()

    return () => {
      cancelled = true
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        void saveHomeLayoutPreference(latestLayoutRef.current).catch(() => {
          // Best-effort flush on unmount.
        })
      }
    }
  }, [])

  const addCard = useCallback(
    (id: HomeCardId) => {
      setLayout((prev) => {
        const next = {
          ...prev,
          cardIds: prev.cardIds.includes(id) ? prev.cardIds : [...prev.cardIds, id],
        }
        latestLayoutRef.current = next
        saveLocalLayout(next)
        queueServerSave(next)
        return next
      })
    },
    [queueServerSave, saveLocalLayout],
  )

  const removeCard = useCallback(
    (id: HomeCardId) => {
      setLayout((prev) => {
        const nextSizes = { ...prev.cardSizes }
        const nextRows = { ...prev.cardRows }
        delete nextSizes[id]
        delete nextRows[id]
        const next: HomeLayoutState = {
          version: HOME_LAYOUT_VERSION,
          cardIds: prev.cardIds.filter((c) => c !== id),
          ...(Object.keys(nextSizes).length > 0 ? { cardSizes: nextSizes } : {}),
          ...(Object.keys(nextRows).length > 0 ? { cardRows: nextRows } : {}),
        }
        latestLayoutRef.current = next
        saveLocalLayout(next)
        queueServerSave(next)
        return next
      })
    },
    [queueServerSave, saveLocalLayout],
  )

  const reorderCards = useCallback(
    (activeId: HomeCardId, overId: HomeCardId) => {
      setLayout((prev) => {
        const oldIndex = prev.cardIds.indexOf(activeId)
        const newIndex = prev.cardIds.indexOf(overId)
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
        const next = { ...prev, cardIds: arrayMove(prev.cardIds, oldIndex, newIndex) }
        latestLayoutRef.current = next
        saveLocalLayout(next)
        queueServerSave(next)
        return next
      })
    },
    [queueServerSave, saveLocalLayout],
  )

  const setCardSize = useCallback(
    (id: HomeCardId, size: HomeCardGridSize) => {
      setLayout((prev) => {
        if (!prev.cardIds.includes(id)) return prev
        const nextSizes = { ...prev.cardSizes }
        if (size === 'half') {
          delete nextSizes[id]
        } else {
          nextSizes[id] = size
        }
        const next: HomeLayoutState = {
          version: HOME_LAYOUT_VERSION,
          cardIds: prev.cardIds,
          ...(Object.keys(nextSizes).length > 0 ? { cardSizes: nextSizes } : {}),
          ...(prev.cardRows ? { cardRows: prev.cardRows } : {}),
        }
        latestLayoutRef.current = next
        saveLocalLayout(next)
        queueServerSave(next)
        return next
      })
    },
    [queueServerSave, saveLocalLayout],
  )

  const setCardRows = useCallback(
    (id: HomeCardId, rows: HomeCardGridRows) => {
      setLayout((prev) => {
        if (!prev.cardIds.includes(id)) return prev
        const nextRows = { ...prev.cardRows, [id]: rows }
        const next: HomeLayoutState = {
          version: HOME_LAYOUT_VERSION,
          cardIds: prev.cardIds,
          ...(prev.cardSizes ? { cardSizes: prev.cardSizes } : {}),
          cardRows: nextRows,
        }
        latestLayoutRef.current = next
        saveLocalLayout(next)
        queueServerSave(next)
        return next
      })
    },
    [queueServerSave, saveLocalLayout],
  )

  const resetLayout = useCallback(() => {
    persist(defaultHomeLayoutState())
  }, [persist])

  return {
    layout,
    editing,
    setEditing,
    addCard,
    removeCard,
    reorderCards,
    setCardSize,
    setCardRows,
    resetLayout,
  }
}
