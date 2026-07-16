'use client'

import { useCallback, useEffect, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_STORAGE_KEY,
  parseHomeLayout,
} from '../config/home-cards.config'
import type { HomeCardGridSize, HomeCardId, HomeLayoutState } from '../types/home-cards'

function defaultHomeLayoutState(): HomeLayoutState {
  return { ...DEFAULT_HOME_LAYOUT, cardIds: [...DEFAULT_HOME_LAYOUT.cardIds] }
}

function loadLayout(): HomeLayoutState {
  if (typeof window === 'undefined') {
    return defaultHomeLayoutState()
  }
  try {
    const raw = window.localStorage.getItem(HOME_LAYOUT_STORAGE_KEY)
    return raw ? parseHomeLayout(JSON.parse(raw) as unknown) : defaultHomeLayoutState()
  } catch {
    return defaultHomeLayoutState()
  }
}

function saveLayout(layout: HomeLayoutState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, JSON.stringify(layout))
}

export function useHomeLayout() {
  const [layout, setLayout] = useState<HomeLayoutState>(defaultHomeLayoutState)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setLayout(loadLayout())
  }, [])

  const persist = useCallback((next: HomeLayoutState) => {
    setLayout(next)
    saveLayout(next)
  }, [])

  const addCard = useCallback((id: HomeCardId) => {
    setLayout((prev) => {
      const next = {
        ...prev,
        cardIds: prev.cardIds.includes(id) ? prev.cardIds : [...prev.cardIds, id],
      }
      saveLayout(next)
      return next
    })
  }, [])

  const removeCard = useCallback((id: HomeCardId) => {
    setLayout((prev) => {
      const nextSizes = { ...prev.cardSizes }
      delete nextSizes[id]
      const next: HomeLayoutState = {
        cardIds: prev.cardIds.filter((c) => c !== id),
        ...(Object.keys(nextSizes).length > 0 ? { cardSizes: nextSizes } : {}),
      }
      saveLayout(next)
      return next
    })
  }, [])

  const reorderCards = useCallback((activeId: HomeCardId, overId: HomeCardId) => {
    setLayout((prev) => {
      const oldIndex = prev.cardIds.indexOf(activeId)
      const newIndex = prev.cardIds.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
      const next = { ...prev, cardIds: arrayMove(prev.cardIds, oldIndex, newIndex) }
      saveLayout(next)
      return next
    })
  }, [])

  const setCardSize = useCallback((id: HomeCardId, size: HomeCardGridSize) => {
    setLayout((prev) => {
      if (!prev.cardIds.includes(id)) return prev
      const nextSizes = { ...prev.cardSizes }
      if (size === 'half') {
        delete nextSizes[id]
      } else {
        nextSizes[id] = size
      }
      const next: HomeLayoutState = {
        cardIds: prev.cardIds,
        ...(Object.keys(nextSizes).length > 0 ? { cardSizes: nextSizes } : {}),
      }
      saveLayout(next)
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    persist({ cardIds: [...DEFAULT_HOME_LAYOUT.cardIds] })
  }, [persist])

  return {
    layout,
    editing,
    setEditing,
    addCard,
    removeCard,
    reorderCards,
    setCardSize,
    resetLayout,
  }
}
