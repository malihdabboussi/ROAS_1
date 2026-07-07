'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'

export interface RemoveOrgMemberConfirmModalProps {
  open: boolean
  displayName: string
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RemoveOrgMemberConfirmModal({
  open,
  displayName,
  removing,
  onClose,
  onConfirm,
}: RemoveOrgMemberConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const canConfirm = confirmText.trim() === displayName.trim()

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}>
      <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" onClick={onClose} />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div
          className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={removing}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
            <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-6 w-6" />
            </div>
            <h2 className="title-h6 text-foreground">Remove from organization?</h2>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              {displayName} will lose access to this organization. This cannot be undone.
            </p>
          </div>
          <div className="px-spacing-6 pb-spacing-4 space-y-spacing-2">
            <label className="body-3 text-foreground block text-left">
              Type <strong>{displayName}</strong> to confirm
            </label>
            <input
              type="text"
              className="input-glass w-full"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={displayName}
              disabled={removing}
              autoFocus
            />
          </div>
          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={removing}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm || removing}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {removing ? (
                <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing…
                </span>
              ) : (
                <span className="relative z-10">Remove</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
