'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

interface BulkDeleteArtifactModalProps {
  open: boolean
  onClose: () => void
  count: number
  onConfirm: () => void
  isDeleting: boolean
  errorMessage: string | null
}

export function BulkDeleteArtifactModal({
  open,
  onClose,
  count,
  onConfirm,
  isDeleting,
  errorMessage,
}: BulkDeleteArtifactModalProps) {
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="z-modal-backdrop fixed inset-0 bg-modal-overlay"
        onClick={isDeleting ? undefined : onClose}
      />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
            <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-6 w-6" />
            </div>
            <h2 className="title-h6 text-foreground">
              Delete {count} artifact{count !== 1 ? 's' : ''}?
            </h2>
            <p className="body-3 text-muted-foreground mt-spacing-2">This cannot be undone.</p>
          </div>
          <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
            <div>
              <label className="label-text text-foreground mb-spacing-2 block">
                Type <span className="font-semibold">&quot;DELETE&quot;</span> to confirm
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 placeholder:text-muted-foreground text-foreground w-full border outline-none disabled:opacity-50"
                disabled={isDeleting}
              />
            </div>
          </div>
          {errorMessage && (
            <div className="px-spacing-6 pb-spacing-3">
              <p className="body-3 text-destructive rounded-spacing-2 bg-destructive/10 px-spacing-3 py-spacing-2">
                {errorMessage}
              </p>
            </div>
          )}
          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmText.trim().toUpperCase() !== 'DELETE' || isDeleting}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : `Delete ${count}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
