'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import type { RemoveTeamMemberTarget } from './team-detail-member-types'

interface TeamDetailRemoveDialogProps {
  target: RemoveTeamMemberTarget | null
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}

export function TeamDetailRemoveDialog({
  target,
  removing,
  onClose,
  onConfirm,
}: TeamDetailRemoveDialogProps) {
  return (
    <DialogPrimitive.Root
      open={target != null}
      onOpenChange={(open) => {
        if (!open && !removing) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 bg-card flex w-full max-w-sm flex-col overflow-hidden border shadow-2xl">
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1 text-center">
                  <div className="bg-destructive/10 mb-spacing-3 h-spacing-12 w-spacing-12 mx-auto flex items-center justify-center rounded-full">
                    <AlertTriangle className="icon-lg text-destructive" aria-hidden />
                  </div>
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Remove {target?.type === 'agent' ? 'agent' : 'human'}?
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-2">
                    Remove{' '}
                    <span className="text-foreground font-semibold">
                      {target?.label ?? 'this member'}
                    </span>{' '}
                    from this team?
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={removing}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={removing}
                className="button-default button-glass-neutral"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={removing}
                className="button-default button-glass-destructive"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
