'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'

interface DeleteSavedTopicSearchConfirmModalProps {
  open: boolean
  searchTitle: string
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteSavedTopicSearchConfirmModal({
  open,
  searchTitle,
  deleting,
  onClose,
  onConfirm,
}: DeleteSavedTopicSearchConfirmModalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}>
      <div
        className="z-modal-backdrop fixed inset-0 bg-modal-overlay"
        onClick={deleting ? undefined : onClose}
      />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div
          className="surface-card wizard-container-border container-modal-md rounded-spacing-4 border-destructive/20 bg-destructive/5 p-spacing-6 relative w-full max-w-md border shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className="bg-destructive/10 mb-spacing-3 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-6 w-6" />
            </div>
            <h2 className="title-h5 text-foreground">Delete saved search?</h2>
            <p className="body-2 text-muted-foreground mt-spacing-4">
              Are you sure you want to delete{' '}
              <span className="text-foreground font-semibold">&quot;{searchTitle}&quot;</span>? This
              cannot be undone.
            </p>
          </div>
          <div className="gap-spacing-2 pt-spacing-6 flex">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? (
                <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </span>
              ) : (
                <span className="relative z-10">Delete</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
