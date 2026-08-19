'use client'

import type { RefObject } from 'react'
import { Check, Edit2, Film, MoreVertical, Trash2 } from 'lucide-react'
import { TYPE_PILLS } from '@/components/media/media-picker-modal.constants'
import type { TypeFilter } from '@/components/media/media-picker-modal.types'
import { MediaPickerDocumentCardPreview } from '@/components/media/MediaPickerDocumentCardPreview'
import type { MediaAsset } from '@/lib/services/media-api'

export function MediaPickerLibraryAssetTile(options: {
  asset: MediaAsset
  multiSelect: boolean
  isSelected: boolean
  isMenuOpen: boolean
  isRenaming: boolean
  menuRef: RefObject<HTMLDivElement | null>
  renameName: string
  setRenameName: (v: string) => void
  onToggleSelect: () => void
  onSelectAsset?: (asset: MediaAsset) => void
  onSelectUrl: (url: string) => void
  onClose: () => void
  onOpenMenu: () => void
  onCloseMenu: () => void
  onStartRename: (name: string) => void
  onRename: (assetId: string, name: string) => void
  onDelete: (assetId: string) => void
  onCancelRename: () => void
}) {
  const {
    asset,
    multiSelect,
    isSelected,
    isMenuOpen,
    isRenaming,
    menuRef,
    renameName,
    setRenameName,
    onToggleSelect,
    onSelectAsset,
    onSelectUrl,
    onClose,
    onOpenMenu,
    onCloseMenu,
    onStartRename,
    onRename,
    onDelete,
    onCancelRename,
  } = options

  const url = asset.public_url ?? ''

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onToggleSelect}
        onDoubleClick={() => {
          if (!multiSelect) {
            if (onSelectAsset) onSelectAsset(asset)
            onSelectUrl(url)
            onClose()
          }
        }}
        className={`rounded-spacing-2 relative aspect-square w-full overflow-hidden border-2 transition-all ${
          isSelected ? 'card-glass-blue border-primary' : 'hover:border-border border-transparent'
        }`}
      >
        {asset.asset_type === 'video' ? (
          <>
            <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
            <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
              <Film className="h-3 w-3 text-white" />
            </div>
          </>
        ) : asset.asset_type === 'document' ? (
          <MediaPickerDocumentCardPreview
            url={url}
            mimeType={asset.mime_type}
            filename={asset.original_filename}
          />
        ) : (
          <img src={url} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
        )}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="chip-glass-green flex h-7 w-7 items-center justify-center rounded-full">
              <Check className="tint-green h-4 w-4" />
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-xs text-white" title={asset.name}>
            {asset.name}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpenMenu()
        }}
        aria-label="Asset actions"
        title="Asset actions"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {isMenuOpen && (
        <div
          ref={menuRef}
          className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-2 absolute right-1 top-8 min-w-32"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onStartRename(asset.name)
              onCloseMenu()
            }}
            className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground flex w-full items-center text-left"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Rename</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void onDelete(asset.id)
            }}
            className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-destructive/10 body-3 text-destructive flex w-full items-center text-left"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {isRenaming && (
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5">
          <input
            autoFocus
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onRename(asset.id, renameName)
              if (e.key === 'Escape') onCancelRename()
            }}
            onBlur={() => void onRename(asset.id, renameName)}
            className="focus:ring-primary w-full rounded bg-white/10 px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1"
          />
        </div>
      )}
    </div>
  )
}

export function mediaPickerEmptyTypeLabel(typeFilter: TypeFilter): string {
  if (typeFilter === 'all') return 'media'
  return TYPE_PILLS.find((p) => p.id === typeFilter)?.label?.toLowerCase() ?? 'media'
}
