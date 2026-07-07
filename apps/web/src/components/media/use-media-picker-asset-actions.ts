import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { deleteAsset, updateAsset, type MediaAsset } from '@/lib/services/media-api'

export function useMediaPickerAssetActions(options: {
  setAssets: Dispatch<SetStateAction<MediaAsset[]>>
  setTotal: Dispatch<SetStateAction<number>>
}) {
  const { setAssets, setTotal } = options
  const [menuAssetId, setMenuAssetId] = useState<string | null>(null)
  const [renameAssetId, setRenameAssetId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const handleRename = useCallback(
    async (assetId: string, newName: string) => {
      if (!newName.trim()) return
      try {
        await updateAsset(assetId, { name: newName.trim() })
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, name: newName.trim() } : a)),
        )
      } catch {
        // rename failed
      }
      setRenameAssetId(null)
    },
    [setAssets],
  )

  const handleDelete = useCallback(
    async (assetId: string) => {
      try {
        await deleteAsset(assetId)
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        setTotal((t) => t - 1)
      } catch {
        // delete failed
      }
      setMenuAssetId(null)
    },
    [setAssets, setTotal],
  )

  return {
    menuAssetId,
    setMenuAssetId,
    renameAssetId,
    setRenameAssetId,
    renameName,
    setRenameName,
    menuRef,
    handleRename,
    handleDelete,
  }
}
