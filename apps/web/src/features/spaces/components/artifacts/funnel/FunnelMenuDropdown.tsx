'use client'

import { useState, type RefObject } from 'react'
import { FunnelArtifactMenuDropdown } from '@/components/artifacts'
import { ConnectCustomDomainModal } from '@/components/domains'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useFunnelMenuActions, type FunnelMenuTarget } from './use-funnel-menu-actions'

interface FunnelMenuDropdownProps {
  funnel: FunnelMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  /** Re-fetch the row list after a mutation (delete/move/duplicate/rename/publish). */
  onChanged?: () => void
  /** Caller-provided “open full view” handler — matches the surface’s fullscreen action. */
  onOpenFullView?: () => void
  /** When set, position the dropdown at this viewport coordinate instead of below the anchor. */
  pointerPosition?: { x: number; y: number } | null
}

export function FunnelMenuDropdown({
  funnel,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  pointerPosition,
}: FunnelMenuDropdownProps) {
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const actions = useFunnelMenuActions({
    funnel,
    onChanged,
  })

  return (
    <>
      {!deleteModalOpen ? (
        <FunnelArtifactMenuDropdown
          funnel={funnel}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onOpenSettings={actions.openSettings}
          onRequestConnectDomain={() => setDomainModalOpen(true)}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenFullView={onOpenFullView}
          onViewAnalytics={actions.viewAnalytics}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <ConnectCustomDomainModal
        open={domainModalOpen}
        onClose={() => {
          setDomainModalOpen(false)
          onClose()
        }}
        title="Connect custom domain"
        onConnect={async (domainId) => {
          await actions.connectCustomDomain(domainId)
          setDomainModalOpen(false)
          onClose()
        }}
      />

      <SpacesArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="funnel"
        entityName={funnel.name?.trim() || 'Untitled Funnel'}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteFunnel()
            setDeleteModalOpen(false)
            onClose()
          } finally {
            setDeleteBusy(false)
          }
        }}
      />
    </>
  )
}
