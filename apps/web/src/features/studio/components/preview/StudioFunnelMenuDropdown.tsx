'use client'

import { useCallback, useState, type RefObject } from 'react'
import { ArtifactDeleteConfirmModal, FunnelArtifactMenuDropdown } from '@/components/artifacts'
import { ConnectCustomDomainModal } from '@/components/domains'
import { useFunnelMenuActions, type FunnelMenuTarget } from '@/lib/artifacts/use-funnel-menu-actions'

interface StudioFunnelMenuDropdownProps {
  funnel: FunnelMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function StudioFunnelMenuDropdown({
  funnel,
  anchorRef,
  onClose,
  onChanged,
  onOpenFullView,
  pointerPosition,
}: StudioFunnelMenuDropdownProps) {
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const actions = useFunnelMenuActions({
    funnel,
    onChanged,
  })

  const openSettings = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('navigate-settings-section', {
        detail: { section: 'funnel' as const, funnelId: funnel.id },
      }),
    )
  }, [funnel.id])

  return (
    <>
      {!deleteModalOpen ? (
        <FunnelArtifactMenuDropdown
          funnel={funnel}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onOpenSettings={openSettings}
          onRequestConnectDomain={() => setDomainModalOpen(true)}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenFullView={onOpenFullView}
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

      <ArtifactDeleteConfirmModal
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
