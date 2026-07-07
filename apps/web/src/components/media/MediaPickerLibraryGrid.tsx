'use client'

import type { RefObject } from 'react'
import { ImageIcon } from 'lucide-react'
import type { TypeFilter } from '@/components/media/media-picker-modal.types'
import {
  mediaPickerEmptyTypeLabel,
  MediaPickerLibraryAssetTile,
} from '@/components/media/MediaPickerLibraryAssetTile'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MediaAsset } from '@/lib/services/media-api'

export function MediaPickerLibraryGrid(options: {
  loading: boolean
  filteredAssets: MediaAsset[]
  typeFilter: TypeFilter
  loadingMore: boolean
  skeletons: number[]
  selectedIds: Set<string>
  multiSelect: boolean
  menuAssetId: string | null
  renameAssetId: string | null
  renameName: string
  menuRef: RefObject<HTMLDivElement | null>
  setRenameName: (v: string) => void
  toggleSelect: (id: string) => void
  onSelectAsset?: (asset: MediaAsset) => void
  onSelect: (url: string) => void
  onClose: () => void
  setMenuAssetId: (id: string | null) => void
  setRenameAssetId: (id: string | null) => void
  handleRename: (assetId: string, name: string) => Promise<void>
  handleDelete: (assetId: string) => Promise<void>
}) {
  const {
    loading,
    filteredAssets,
    typeFilter,
    loadingMore,
    skeletons,
    selectedIds,
    multiSelect,
    menuAssetId,
    renameAssetId,
    renameName,
    menuRef,
    setRenameName,
    toggleSelect,
    onSelectAsset,
    onSelect,
    onClose,
    setMenuAssetId,
    setRenameAssetId,
    handleRename,
    handleDelete,
  } = options

  if (loading) {
    return (
      <div className="py-spacing-8 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading media..." />
      </div>
    )
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="py-spacing-8 flex flex-col items-center justify-center">
        <ImageIcon className="text-muted-foreground/30 h-10 w-10" />
        <p className="body-3 text-muted-foreground mt-spacing-2">
          {typeFilter !== 'all'
            ? `No ${mediaPickerEmptyTypeLabel(typeFilter)} found`
            : 'No media found'}
        </p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 grid grid-cols-5">
      {filteredAssets.map((asset) => {
        const isSelected = selectedIds.has(asset.id)
        const isMenuOpen = menuAssetId === asset.id
        const isRenaming = renameAssetId === asset.id
        return (
          <MediaPickerLibraryAssetTile
            key={asset.id}
            asset={asset}
            multiSelect={multiSelect}
            isSelected={isSelected}
            isMenuOpen={isMenuOpen}
            isRenaming={isRenaming}
            menuRef={menuRef}
            renameName={renameName}
            setRenameName={setRenameName}
            onToggleSelect={() => toggleSelect(asset.id)}
            onSelectAsset={onSelectAsset}
            onSelectUrl={onSelect}
            onClose={onClose}
            onOpenMenu={() => setMenuAssetId(isMenuOpen ? null : asset.id)}
            onCloseMenu={() => setMenuAssetId(null)}
            onStartRename={(name) => {
              setRenameAssetId(asset.id)
              setRenameName(name)
              setMenuAssetId(null)
            }}
            onRename={handleRename}
            onDelete={handleDelete}
            onCancelRename={() => setRenameAssetId(null)}
          />
        )
      })}
      {loadingMore &&
        skeletons
          .slice(0, 4)
          .map((i) => (
            <div
              key={`more-${i}`}
              className="rounded-spacing-2 bg-muted aspect-square animate-pulse"
            />
          ))}
    </div>
  )
}
