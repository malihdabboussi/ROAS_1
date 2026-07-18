'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AlertTriangle, X } from 'lucide-react'
import type { CustomFieldDefinition } from '@/lib/properties/custom-fields'

interface CustomFieldDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deletingField: CustomFieldDefinition | null
  isDeleting: boolean
  onConfirm: () => void
}

export function CustomFieldDeleteDialog({
  open,
  onOpenChange,
  deletingField,
  isDeleting,
  onConfirm,
}: CustomFieldDeleteDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Delete Custom Field</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex w-full max-w-md flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-icon-bare btn-close-absolute"
              aria-label="Close"
            >
              <X className="icon-sm" />
            </button>
            <div className="p-spacing-6 text-center">
              <div className="bg-destructive/10 mb-spacing-3 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-6 w-6" />
              </div>
              <h2 className="title-h6">Delete Custom Field</h2>
              <DialogPrimitive.Description className="body-2 text-muted-foreground mt-spacing-2">
                Are you sure you want to delete{' '}
                <span className="font-semibold">&ldquo;{deletingField?.name}&rdquo;</span>?
              </DialogPrimitive.Description>
            </div>
            <div className="gap-spacing-3 px-spacing-6 pb-spacing-6 flex">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
                className="button-glass-neutral flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                <span className="relative z-10">{isDeleting ? 'Deleting...' : 'Delete Field'}</span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
