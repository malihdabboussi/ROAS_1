import { useCallback, useMemo, useState } from 'react'
import { deleteAsset, type MediaAsset } from '@/lib/services/media-api'
import { deleteDocument } from '../../../services/artifact-preview.service'
import type { ConversationDocument } from '../../../types'
import type { Selection } from './media-tab.types'

interface UseMediaTabBulkSelectionParams {
  selection: Selection
  setSelection: (selection: Selection) => void
  loadAssets: () => Promise<void>
  loadDocs: () => Promise<void>
}

export function useMediaTabBulkSelection({
  selection,
  setSelection,
  loadAssets,
  loadDocs,
}: UseMediaTabBulkSelectionParams) {
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [bulkSelectedItems, setBulkSelectedItems] = useState<
    Map<string, { kind: 'asset' | 'doc'; asset?: MediaAsset; doc?: ConversationDocument }>
  >(new Map())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

  const bulkSelectedIds = useMemo(() => new Set(bulkSelectedItems.keys()), [bulkSelectedItems])

  const toggleBulkSelectMode = useCallback(() => {
    setBulkSelectMode((prev) => {
      if (prev) {
        setBulkSelectedItems(new Map())
      } else {
        setSelection(null)
      }
      return !prev
    })
  }, [setSelection])

  const toggleBulkSelectItem = useCallback(
    (
      id: string,
      entry: { kind: 'asset' | 'doc'; asset?: MediaAsset; doc?: ConversationDocument },
    ) => {
      setBulkSelectedItems((prev) => {
        const next = new Map(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.set(id, entry)
        }
        return next
      })
    },
    [],
  )

  const handleConfirmBulkDelete = useCallback(async () => {
    if (bulkSelectedItems.size === 0) return
    setIsBulkDeleting(true)
    setBulkDeleteError(null)

    const errors: string[] = []
    for (const [id, entry] of bulkSelectedItems) {
      try {
        if (entry.kind === 'asset') {
          await deleteAsset(id)
        } else {
          await deleteDocument(id)
        }
      } catch (err) {
        const label = entry.kind === 'asset' ? (entry.asset?.name ?? id) : (entry.doc?.title ?? id)
        errors.push(`${label}: ${err instanceof Error ? err.message : 'Failed'}`)
      }
    }

    await Promise.all([loadAssets(), loadDocs()])

    if (errors.length > 0) {
      setBulkDeleteError(errors.join('\n'))
    } else {
      setShowBulkDeleteModal(false)
      setBulkSelectMode(false)
      setBulkSelectedItems(new Map())
    }

    if (selection) {
      const selectedId =
        selection.type === 'document'
          ? selection.doc.id
          : selection.type === 'deliverable'
            ? selection.deliverable.id
            : selection.asset.id
      if (bulkSelectedItems.has(selectedId)) setSelection(null)
    }

    setIsBulkDeleting(false)
  }, [bulkSelectedItems, selection, loadAssets, loadDocs, setSelection])

  return {
    bulkSelectMode,
    bulkSelectedCount: bulkSelectedItems.size,
    bulkSelectedIds,
    toggleBulkSelectMode,
    toggleBulkSelectItem,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    isBulkDeleting,
    bulkDeleteError,
    handleConfirmBulkDelete,
  }
}
