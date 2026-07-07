'use client'

import { useCallback, useMemo, useState } from 'react'

interface Identifiable {
  id: string
}

interface UseSelectionStateReturn {
  selectedIds: string[]
  allSelected: boolean
  handleToggleSelection: (id: string, checked: boolean) => void
  handleSelectAll: (checked: boolean) => void
  clearSelection: () => void
}

export function useSelectionState<T extends Identifiable>(items: T[]): UseSelectionStateReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const allSelected = useMemo(
    () => selectedIds.length > 0 && selectedIds.length === items.length,
    [selectedIds.length, items.length],
  )

  const handleToggleSelection = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(items.map((item) => item.id))
      } else {
        setSelectedIds([])
      }
    },
    [items],
  )

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  return {
    selectedIds,
    allSelected,
    handleToggleSelection,
    handleSelectAll,
    clearSelection,
  }
}
