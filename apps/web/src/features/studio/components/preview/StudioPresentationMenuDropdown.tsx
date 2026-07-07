'use client'

import { useState, type RefObject } from 'react'
import { ArtifactDeleteConfirmModal, PresentationArtifactMenuDropdown } from '@/components/artifacts'
import type {
  PresentationMenuTarget,
  PresentationPreviewOverflowMenuProps,
} from '@/lib/artifacts'
import { usePresentationMenuActions } from '@/lib/artifacts/use-presentation-menu-actions'

interface StudioPresentationMenuDropdownProps {
  presentation: PresentationMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
  previewOverflow?: PresentationPreviewOverflowMenuProps
}

export function StudioPresentationMenuDropdown({
  presentation,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
  previewOverflow,
}: StudioPresentationMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = usePresentationMenuActions({
    presentation,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <PresentationArtifactMenuDropdown
          presentation={presentation}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenFullView={onOpenFullView}
          pointerPosition={pointerPosition}
          previewOverflow={previewOverflow}
        />
      ) : null}

      <ArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="presentation"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deletePresentation()
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
