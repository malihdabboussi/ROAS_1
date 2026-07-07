'use client'

import { useCallback, useState, type RefObject } from 'react'
import { SequenceArtifactMenuDropdown } from '@/components/artifacts'
import type { SequenceMenuTarget } from '@/lib/artifacts'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useSequenceMenuActions } from './use-sequence-menu-actions'

interface SequenceMenuDropdownProps {
  sequence: SequenceMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function SequenceMenuDropdown({
  sequence,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: SequenceMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = useSequenceMenuActions({
    sequence,
    onChanged,
  })

  const handleViewAnalytics = useCallback(async () => {
    await actions.viewAnalytics()
  }, [actions])

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
          onViewAnalytics={handleViewAnalytics}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <SpacesArtifactDeleteConfirmModal
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
