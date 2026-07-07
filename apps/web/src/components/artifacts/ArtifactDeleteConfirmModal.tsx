'use client'

import { AlertCircle, X } from 'lucide-react'

export type ArtifactDeleteKind =
  | 'funnel'
  | 'offer'
  | 'social_post'
  | 'sequence'
  | 'presentation'
  | 'avatar'
  | 'ad'
  | 'form'
  | 'email'

interface ArtifactDeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  kind: ArtifactDeleteKind
  entityName: string
  onConfirm: () => void | Promise<void>
  isDeleting: boolean
}

export function ArtifactDeleteConfirmModal({
  open,
  onClose,
  kind,
  entityName,
  onConfirm,
  isDeleting,
}: ArtifactDeleteConfirmModalProps) {
  if (!open) return null

  const title =
    kind === 'funnel'
      ? 'Delete funnel?'
      : kind === 'social_post'
        ? 'Delete social post?'
        : kind === 'sequence'
          ? 'Delete sequence?'
          : kind === 'presentation'
            ? 'Delete presentation?'
            : kind === 'avatar'
              ? 'Delete avatar?'
              : kind === 'ad'
                ? 'Delete ad?'
                : kind === 'form'
                  ? 'Delete form?'
                  : kind === 'email'
                    ? 'Delete email?'
                    : 'Delete offer?'

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
            <h2 className="title-h6 text-foreground">{title}</h2>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              Are you sure you want to delete{' '}
              <span className="text-foreground font-semibold">&quot;{entityName}&quot;</span>
              {`? This cannot be undone.`}
            </p>
          </div>
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
              onClick={() => void onConfirm()}
              disabled={isDeleting}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Approve delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
