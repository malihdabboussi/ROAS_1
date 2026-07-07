'use client'

import { useState, type RefObject } from 'react'
import { AvatarArtifactMenuDropdown } from '@/components/artifacts'
import type { AvatarMenuTarget } from '@/lib/artifacts'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useAvatarMenuActions } from './use-avatar-menu-actions'

interface AvatarMenuDropdownProps {
  avatar: AvatarMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function AvatarMenuDropdown({
  avatar,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: AvatarMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = useAvatarMenuActions({
    avatar,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <AvatarArtifactMenuDropdown
          avatar={avatar}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenFullView={onOpenFullView}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <SpacesArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="avatar"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteAvatar()
            setDeleteModalOpen(false)
            onDeleted?.()
            onClose()
          } finally {
            setDeleteBusy(false)
          }
        }}
      />
    </>
  )
}
