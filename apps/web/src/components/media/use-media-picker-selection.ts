import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { MediaAsset } from '@/lib/services/media-api'

export function useMediaPickerSelection(options: {
  multiSelect: boolean
  assets: MediaAsset[]
  onSelect: (url: string) => void
  onSelectAsset?: (asset: MediaAsset) => void
  onSelectAssets?: (assets: MediaAsset[]) => void
  onClose: () => void
  keepOpenAfterImport: boolean
}) {
  const {
    multiSelect,
    assets,
    onSelect,
    onSelectAsset,
    onSelectAssets,
    onClose,
    keepOpenAfterImport,
  } = options
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const resetSelection = useCallback(() => setSelectedIds(new Set()), [])

  const toggleSelect = useCallback(
    (assetId: string) => {
      setSelectedIds((prev) => {
        if (multiSelect) {
          const next = new Set(prev)
          if (next.has(assetId)) next.delete(assetId)
          else next.add(assetId)
          return next
        }
        return prev.has(assetId) ? new Set() : new Set([assetId])
      })
    },
    [multiSelect],
  )

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) return
    const selected = assets.filter((a) => selectedIds.has(a.id))
    if (multiSelect && onSelectAssets) {
      onSelectAssets(selected)
    } else {
      const first = selected[0]
      if (first) {
        if (onSelectAsset) onSelectAsset(first)
        onSelect(first.public_url ?? '')
      }
    }
    if (keepOpenAfterImport) {
      toast.success(`${selected.length} file(s) queued for import`)
      setSelectedIds(new Set())
    } else {
      onClose()
    }
  }, [
    selectedIds,
    assets,
    multiSelect,
    onSelect,
    onSelectAsset,
    onSelectAssets,
    onClose,
    keepOpenAfterImport,
  ])

  return {
    selectedIds,
    setSelectedIds,
    resetSelection,
    toggleSelect,
    handleConfirm,
  }
}
