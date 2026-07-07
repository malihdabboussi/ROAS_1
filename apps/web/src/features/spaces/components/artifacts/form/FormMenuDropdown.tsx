'use client'

import { useState, type RefObject } from 'react'
import { FormArtifactMenuDropdown } from '@/components/artifacts'
import type { FormMenuTarget } from '@/lib/artifacts'
import { SpacesArtifactDeleteConfirmModal } from '../SpacesArtifactDeleteConfirmModal'
import { useFormMenuActions } from './use-form-menu-actions'

interface FormMenuDropdownProps {
  form: FormMenuTarget
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged?: () => void
  onOpenSettings?: () => void
  onRequestRename?: () => void
  onOpenResponses?: () => void
  onOpenFullView?: () => void
  pointerPosition?: { x: number; y: number } | null
}

export function FormMenuDropdown({
  form,
  anchorRef,
  onClose,
  onChanged,
  onOpenSettings,
  onRequestRename,
  onOpenResponses,
  onOpenFullView,
  pointerPosition,
}: FormMenuDropdownProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const actions = useFormMenuActions({ form, onChanged })

  return (
    <>
      {!deleteModalOpen ? (
        <FormArtifactMenuDropdown
          form={form}
          anchorRef={anchorRef}
          actions={actions}
          onClose={onClose}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onOpenSettings={onOpenSettings}
          onRequestRename={onRequestRename}
          onOpenResponses={onOpenResponses}
          onOpenFullView={onOpenFullView}
          pointerPosition={pointerPosition}
        />
      ) : null}

      <SpacesArtifactDeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteModalOpen(false)
        }}
        kind="form"
        entityName={actions.displayName}
        isDeleting={deleteBusy}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await actions.deleteForm()
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
