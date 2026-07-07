'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, ChevronDown, Loader2 } from 'lucide-react'

export type NodeDetailTransferOperation = 'move' | 'copy'

export type NodeDetailTransferTarget = {
  id: string
  label: string
  scopeType: 'user' | 'agent' | 'campaign'
  agentId: string | null
  campaignId?: string
}

interface NodeDetailTransferDialogProps {
  isSource: boolean
  onDropdownOpenChange: (open: boolean) => void
  onOpenChange: (open: boolean) => void
  onTargetChange: (targetId: string) => void
  onTransfer: (operation: NodeDetailTransferOperation) => void | Promise<void>
  openOperation: NodeDetailTransferOperation | null
  targetId: string
  targets: NodeDetailTransferTarget[]
  transferDropdownOpen: boolean
  transferring: boolean
}

export function NodeDetailTransferDialog({
  isSource,
  onDropdownOpenChange,
  onOpenChange,
  onTargetChange,
  onTransfer,
  openOperation,
  targetId,
  targets,
  transferDropdownOpen,
  transferring,
}: NodeDetailTransferDialogProps) {
  const isMove = openOperation === 'move'

  return (
    <DialogPrimitive.Root open={openOperation !== null} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{isMove ? 'Move to' : 'Copy to'}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div
            className="surface-card wizard-container-border rounded-spacing-4 relative flex w-full max-w-md flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
              <h2 className="title-h6 text-foreground">{isMove ? 'MOVE TO' : 'COPY TO'}</h2>
              <p className="body-2 text-muted-foreground mt-spacing-2">
                {isMove
                  ? isSource
                    ? 'This will move this source and all connected entries to the selected brain. It will be removed from the current brain.'
                    : 'This will move this item to the selected brain. It will be removed from the current brain.'
                  : isSource
                    ? 'This will copy this source and all connected entries to the selected brain. The original will remain.'
                    : 'This will copy this item to the selected brain. The original will remain.'}
              </p>
              <div className="mt-spacing-4 space-y-spacing-2">
                <label className="body-3 text-foreground font-medium">Destination</label>
                <div className="relative" data-transfer-dropdown>
                  <button
                    type="button"
                    disabled={transferring}
                    onClick={() => onDropdownOpenChange(!transferDropdownOpen)}
                    className="border-border surface-bg rounded-spacing-2 px-spacing-3 body-2 text-foreground h-spacing-10 flex w-full items-center justify-between border disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate">
                      {targets.find((target) => target.id === targetId)?.label ?? 'Select brain'}
                    </span>
                    <ChevronDown className="icon-xs text-muted-foreground ml-spacing-2 flex-shrink-0" />
                  </button>
                  {transferDropdownOpen && (
                    <div className="dropdown-menu-solid p-spacing-2 rounded-spacing-2 mt-spacing-1 z-dropdown absolute left-0 right-0 top-full">
                      <div className="space-y-spacing-0">
                        {targets.map((target) => {
                          const isSelected = targetId === target.id
                          const badgeClass =
                            target.scopeType === 'campaign'
                              ? 'badge-glass-purple'
                              : target.scopeType === 'agent'
                                ? 'badge-glass-orange'
                                : 'badge-glass-green'
                          return (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => {
                                onTargetChange(target.id)
                                onDropdownOpenChange(false)
                              }}
                              className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                                isSelected
                                  ? 'bg-primary/10 text-muted-foreground'
                                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="icon-sm text-primary flex-shrink-0" />
                              ) : (
                                <div className="icon-sm flex-shrink-0" />
                              )}
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {target.label}
                              </span>
                              <span
                                className={`badge-glass typo-caption shrink-0 font-medium capitalize ${badgeClass}`}
                              >
                                {target.scopeType}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
              <button
                type="button"
                disabled={transferring}
                onClick={() => onOpenChange(false)}
                className="button-default button-glass-neutral flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferring || !targetId || openOperation === null}
                onClick={() => {
                  if (openOperation) void onTransfer(openOperation)
                }}
                className={`button-default flex-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isMove ? 'button-glass-destructive' : 'button-glass-accent'
                }`}
              >
                {transferring ? (
                  <Loader2 className="icon-sm mx-auto animate-spin" />
                ) : isMove ? (
                  'Move'
                ) : (
                  'Copy'
                )}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
