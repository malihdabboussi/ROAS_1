'use client'

import { useState, type RefObject } from 'react'
import { ArtifactDeleteConfirmModal, SequenceArtifactMenuDropdown } from '@/components/artifacts'
import type { SequenceMenuTarget } from '@/lib/artifacts'
import { useSequenceMenuActions } from '@/lib/artifacts/use-sequence-menu-actions'

interface StudioSequenceMenuDropdownProps {
  sequence: SequenceMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function StudioSequenceMenuDropdown({
  sequence,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: StudioSequenceMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = useSequenceMenuActions({
    sequence,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <SequenceArtifactMenuDropdown
          sequence={sequence}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenFullView={onOpenFullView}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <ArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="sequence"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteSequence()
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
