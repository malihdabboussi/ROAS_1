'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2 } from 'lucide-react'

interface NodeDetailDeleteDialogProps {
  confirmWord: string
  deleteConfirmInput: string
  deleting: boolean
  isSource: boolean
  needsTypedConfirm: boolean
  nodeType: string
  onDelete: () => void | Promise<void>
  onInputChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function NodeDetailDeleteDialog({
  confirmWord,
  deleteConfirmInput,
  deleting,
  isSource,
  needsTypedConfirm,
  nodeType,
  onDelete,
  onInputChange,
  onOpenChange,
  open,
}: NodeDetailDeleteDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Confirm delete</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div
            className="surface-card wizard-container-border rounded-spacing-4 relative flex w-full max-w-md flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
              <h2 className="title-h6 text-foreground">
                Delete{' '}
                {isSource
                  ? 'Source'
                  : nodeType === 'snapshot'
                    ? 'Neural Snapshot'
                    : nodeType === 'sk_entry'
                      ? 'Knowledge Entry'
                      : 'Memory'}
              </h2>
              <DialogPrimitive.Description className="body-2 text-muted-foreground mt-spacing-2">
                {isSource
                  ? 'This will permanently delete this source and ALL connected knowledge entries. This action cannot be undone.'
                  : `This will permanently delete this ${nodeType === 'snapshot' ? 'neural snapshot' : nodeType === 'sk_entry' ? 'knowledge entry' : 'memory'}. This action cannot be undone.`}
              </DialogPrimitive.Description>
              {needsTypedConfirm && (
                <div className="mt-spacing-4 space-y-spacing-2">
                  <label className="body-3 text-foreground">
                    Type <strong className="text-destructive">delete all</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="delete all"
                    disabled={deleting}
                    className="input-glass w-full"
                  />
                </div>
              )}
            </div>
            <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
              <button
                type="button"
                disabled={deleting}
                onClick={() => onOpenChange(false)}
                className="button-default button-glass-neutral flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleting ||
                  (needsTypedConfirm && deleteConfirmInput.trim().toLowerCase() !== confirmWord)
                }
                onClick={onDelete}
                className="button-default button-glass-destructive flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? <Loader2 className="icon-sm animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
