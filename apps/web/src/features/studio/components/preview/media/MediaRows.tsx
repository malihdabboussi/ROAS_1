'use client'

import type { MouseEvent, MutableRefObject } from 'react'
import { Check, MoreVertical, Video } from 'lucide-react'
import type { MediaAsset } from '@/lib/services/media-api'
import type { ConversationDocument } from '../../../types'
import { ItemMenuDropdown, RenameInput } from './MediaItemMenu'
import { DocThumbnail, MediaFileListThumbnail } from './MediaThumbnails'
import type { Selection } from './media-tab.types'

interface DocRowProps {
  doc: ConversationDocument
  selection: Selection
  setSelection: (s: Selection) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  handleRenameDoc: (doc: ConversationDocument) => void
  handleDeleteDoc: (doc: ConversationDocument) => Promise<void>
  handleConfirmRenameDoc: (id: string, title: string) => Promise<void>
  bulkSelectMode?: boolean
  isChecked?: boolean
  onToggleBulkSelect?: () => void
}

interface AssetRowProps {
  asset: MediaAsset
  type: 'image' | 'video' | 'file'
  selection: Selection
  setSelection: (s: Selection) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  handleRenameAsset: (asset: MediaAsset) => void
  handleDeleteAsset: (asset: MediaAsset) => Promise<void>
  handleConfirmRenameAsset: (id: string, name: string) => Promise<void>
  bulkSelectMode?: boolean
  isChecked?: boolean
  onToggleBulkSelect?: () => void
}

function BulkCheck({ isChecked }: { isChecked: boolean }) {
  return (
    <div
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
      }`}
    >
      {isChecked && <Check className="h-3 w-3" />}
    </div>
  )
}

function RowMenuButton({
  isMenuOpen,
  menuBtnRef,
  onToggle,
}: {
  isMenuOpen: boolean
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      ref={isMenuOpen ? menuBtnRef : undefined}
      type="button"
      onClick={onToggle}
      className={`flex h-6 w-6 items-center justify-center rounded transition-opacity ${
        isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      title="More options"
    >
      <MoreVertical className="h-3.5 w-3.5" />
    </button>
  )
}

export function DocRow({
  doc,
  selection,
  setSelection,
  editingId,
  setEditingId,
  menuOpenId,
  setMenuOpenId,
  menuBtnRef,
  handleRenameDoc,
  handleDeleteDoc,
  handleConfirmRenameDoc,
  bulkSelectMode = false,
  isChecked = false,
  onToggleBulkSelect,
}: DocRowProps) {
  const isEditing = editingId === `doc-${doc.id}`
  const isMenuOpen = menuOpenId === `doc-${doc.id}`

  return (
    <div
      className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 group flex w-full items-center transition-colors"
      draggable={!bulkSelectMode}
      onDragStart={
        bulkSelectMode
          ? undefined
          : (e) => {
              e.dataTransfer.setData(
                'application/x-vibey-artifact',
                JSON.stringify({ id: doc.id, type: 'document', label: doc.title ?? 'Untitled' }),
              )
              e.dataTransfer.effectAllowed = 'copy'
            }
      }
    >
      {bulkSelectMode ? (
        <button
          type="button"
          onClick={onToggleBulkSelect}
          className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
        >
          <BulkCheck isChecked={isChecked} />
          <DocThumbnail doc={doc} />
          <div className="min-w-0 flex-1 truncate">
            <p className="body-2 text-muted-foreground truncate">{doc.title ?? 'Untitled'}</p>
          </div>
        </button>
      ) : isEditing ? (
        <RenameInput
          initialValue={doc.title ?? 'Untitled'}
          onConfirm={(v) => handleConfirmRenameDoc(doc.id, v)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <>
          <button
            onClick={() => setSelection({ type: 'document', doc })}
            className={`gap-spacing-2 flex min-w-0 flex-1 items-center text-left transition-colors ${
              selection?.type === 'document' && selection.doc.id === doc.id
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <DocThumbnail doc={doc} />
            <div className="min-w-0 flex-1 truncate">
              <p className="body-2 truncate">{doc.title ?? 'Untitled'}</p>
            </div>
          </button>
          <div className="relative flex-shrink-0">
            <RowMenuButton
              isMenuOpen={isMenuOpen}
              menuBtnRef={menuBtnRef}
              onToggle={(e) => {
                e.stopPropagation()
                setMenuOpenId(isMenuOpen ? null : `doc-${doc.id}`)
              }}
            />
            {isMenuOpen && (
              <ItemMenuDropdown
                anchorRef={menuBtnRef}
                onClose={() => setMenuOpenId(null)}
                onRename={() => handleRenameDoc(doc)}
                onDelete={() => void handleDeleteDoc(doc)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function AssetRow({
  asset,
  type,
  selection,
  setSelection,
  editingId,
  setEditingId,
  menuOpenId,
  setMenuOpenId,
  menuBtnRef,
  handleRenameAsset,
  handleDeleteAsset,
  handleConfirmRenameAsset,
  bulkSelectMode = false,
  isChecked = false,
  onToggleBulkSelect,
}: AssetRowProps) {
  const prefix = type === 'image' ? 'img' : type === 'video' ? 'vid' : 'file'
  const isEditing = editingId === `asset-${asset.id}`
  const isMenuOpen = menuOpenId === `${prefix}-${asset.id}`
  const displayName = asset.source_prompt ?? asset.name
  const dragType =
    type === 'image' ? 'media-image' : type === 'video' ? 'media-video' : 'media-file'

  const thumb =
    type === 'image' ? (
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        <img
          src={asset.public_url ?? ''}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    ) : type === 'video' ? (
      <div className="bg-secondary relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        <video
          src={asset.public_url ?? ''}
          preload="metadata"
          muted
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="text-muted-foreground h-3 w-3" />
        </div>
      </div>
    ) : (
      <MediaFileListThumbnail asset={asset} />
    )

  return (
    <div
      className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 group flex w-full items-center transition-colors"
      draggable={!bulkSelectMode}
      onDragStart={
        bulkSelectMode
          ? undefined
          : (e) => {
              e.dataTransfer.setData(
                'application/x-vibey-artifact',
                JSON.stringify({ id: asset.id, type: dragType, label: displayName }),
              )
              e.dataTransfer.effectAllowed = 'copy'
            }
      }
    >
      {bulkSelectMode ? (
        <button
          type="button"
          onClick={onToggleBulkSelect}
          className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
        >
          <BulkCheck isChecked={isChecked} />
          {thumb}
          <div className="min-w-0 flex-1 truncate">
            <p className="body-2 text-muted-foreground truncate">{displayName}</p>
          </div>
        </button>
      ) : isEditing ? (
        <RenameInput
          initialValue={asset.name}
          onConfirm={(v) => handleConfirmRenameAsset(asset.id, v)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <>
          <button
            onClick={() => setSelection({ type, asset })}
            className={`gap-spacing-2 flex min-w-0 flex-1 items-center text-left transition-colors ${
              selection?.type === type && selection.asset.id === asset.id
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {thumb}
            <div className="min-w-0 flex-1 truncate">
              <p className="body-2 truncate">{displayName}</p>
            </div>
          </button>
          <div className="relative flex-shrink-0">
            <RowMenuButton
              isMenuOpen={isMenuOpen}
              menuBtnRef={menuBtnRef}
              onToggle={(e) => {
                e.stopPropagation()
                setMenuOpenId(isMenuOpen ? null : `${prefix}-${asset.id}`)
              }}
            />
            {isMenuOpen && (
              <ItemMenuDropdown
                anchorRef={menuBtnRef}
                onClose={() => setMenuOpenId(null)}
                onRename={() => handleRenameAsset(asset)}
                onDelete={() => void handleDeleteAsset(asset)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
