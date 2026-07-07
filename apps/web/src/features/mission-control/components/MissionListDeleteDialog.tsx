import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'
import type { Mission } from '../types'

interface MissionListDeleteDialogProps {
  open: boolean
  pendingMission: Mission | null
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function MissionListDeleteDialog({
  open,
  pendingMission,
  isDeleting,
  onOpenChange,
  onCancel,
  onConfirm,
}: MissionListDeleteDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="z-modal-backdrop fixed inset-0" />
        <Dialog.Content className="z-modal-content fixed inset-0 flex items-center justify-center p-4">
          <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-sm overflow-hidden">
            <div className="p-spacing-6 gap-spacing-3 flex flex-col items-center text-center">
              <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-6 w-6" />
              </div>
              <div className="space-y-spacing-1">
                <h2 className="title-h6">Delete Mission</h2>
                <p className="body-3 text-muted-foreground">
                  Are you sure you want to delete{' '}
                  <span className="text-foreground font-semibold">"{pendingMission?.title}"</span>
                  ? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-spacing-6 pb-spacing-6 gap-spacing-2 flex">
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground body-3 flex-1 rounded-lg px-4 py-2 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirm()}
                disabled={isDeleting}
                className="button-glass-destructive body-3 flex-1 rounded-lg px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
          <Dialog.Title className="sr-only">Delete Mission</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
