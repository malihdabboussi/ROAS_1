'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'

type CompleteSubtasksConfirmDialogProps = {
  open: boolean
  openCount: number
  onYes: () => void
  onNo: () => void
  onCancel: () => void
}

export function CompleteSubtasksConfirmDialog({
  open,
  openCount,
  onYes,
  onNo,
  onCancel,
}: CompleteSubtasksConfirmDialogProps) {
  const countLabel = openCount === 1 ? '1 open subtask' : `${openCount} open subtasks`

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 border-border w-full max-w-md border bg-card p-spacing-6 shadow-2xl">
            <div className="space-y-spacing-2">
              <DialogPrimitive.Title className="title-h6 text-foreground">
                Also complete subtasks?
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="body-2 text-muted-foreground">
                This task has {countLabel}. Complete them with this task, or leave them open.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-spacing-6 gap-spacing-2 flex flex-wrap items-center justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="button-default button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onNo}
                className="button-default button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                No, just this task
              </button>
              <button
                type="button"
                onClick={onYes}
                className="button-default button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                Yes, complete all
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
