'use client'

import { useState, type RefObject } from 'react'
import { EmailArtifactMenuDropdown } from '@/components/artifacts'
import type { EmailMenuTarget } from '@/lib/artifacts'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useEmailMenuActions } from './use-email-menu-actions'

interface EmailMenuDropdownProps {
  email: EmailMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  /** Called after a successful delete (host clears selection). */
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function EmailMenuDropdown({
  email,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: EmailMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const actions = useEmailMenuActions({
    email,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <EmailArtifactMenuDropdown
          email={email}
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
        kind="email"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteEmail()
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
