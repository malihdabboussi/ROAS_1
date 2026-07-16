'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmText: string
  confirmingText?: string
  confirmDisabled?: boolean
  /** Defaults to destructive. Use primary for non-destructive confirms (e.g. mark complete). */
  confirmTone?: 'destructive' | 'primary'
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  confirmingText,
  confirmDisabled = false,
  confirmTone = 'destructive',
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const confirmClass =
    confirmTone === 'primary' ? 'button-glass-primary' : 'button-glass-destructive'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-md">
            <div className="space-y-spacing-2">
              <DialogPrimitive.Title className="title-h6">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="body-2 text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>

            <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                >
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onConfirm()
                }}
                disabled={confirmDisabled}
                className={`${confirmClass} rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50`}
              >
                {confirmDisabled && confirmingText ? confirmingText : confirmText}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
