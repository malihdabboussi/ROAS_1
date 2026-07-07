'use client'

import { useCallback, useState, type RefObject } from 'react'
import { AdArtifactMenuDropdown } from '@/components/artifacts'
import type { AdMenuTarget } from '@/lib/artifacts'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useAdMenuActions } from './use-ad-menu-actions'

interface AdMenuDropdownProps {
  ad: AdMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  onDeleted?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function AdMenuDropdown({
  ad,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  onDeleted,
  pointerPosition,
}: AdMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const actions = useAdMenuActions({
    ad,
    onChanged,
  })

  const handleViewAnalytics = useCallback(async () => {
    await actions.viewAnalytics()
  }, [actions])

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
          onViewAnalytics={handleViewAnalytics}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <SpacesArtifactDeleteConfirmModal
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
