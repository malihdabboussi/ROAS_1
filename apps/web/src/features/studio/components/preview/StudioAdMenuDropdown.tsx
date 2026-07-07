'use client'

import { useState, type RefObject } from 'react'
import { AdArtifactMenuDropdown, ArtifactDeleteConfirmModal } from '@/components/artifacts'
import type { AdMenuTarget } from '@/lib/artifacts'
import { useAdMenuActions } from '@/lib/artifacts/use-ad-menu-actions'

interface StudioAdMenuDropdownProps {
  ad: AdMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function StudioAdMenuDropdown({
  ad,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: StudioAdMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = useAdMenuActions({
    ad,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <AdArtifactMenuDropdown
          ad={ad}
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
        kind="ad"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteAd()
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
