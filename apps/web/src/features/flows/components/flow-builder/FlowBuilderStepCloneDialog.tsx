'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { FlowBuilderCanvasStep } from '@/lib/flows/flow-builder-canvas.utils'
import type { FlowBuilderStepCloneMode } from '@/lib/flows/flow-builder-step-actions.utils'

export function FlowBuilderStepCloneDialog({
  open,
  step,
  canvasSteps,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  step: FlowBuilderCanvasStep
  canvasSteps: FlowBuilderCanvasStep[]
  onOpenChange: (open: boolean) => void
  onConfirm: (input: { insertAfterActionIndex: number; mode: FlowBuilderStepCloneMode }) => void
}) {
  const [mode, setMode] = useState<FlowBuilderStepCloneMode>('single')
  const [insertAfterStepId, setInsertAfterStepId] = useState(step.id)

  if (step.selection.kind !== 'action') return null

  const insertOptions: AutomationSolidOption[] = canvasSteps
    .filter((row) => row.selection.kind === 'action' || row.selection.kind === 'trigger')
    .map((row) => ({
      value: row.id,
      label: `After Step ${row.stepNumber}: ${row.label}`,
    }))

  const insertAfterActionIndex = (() => {
    const target = canvasSteps.find((row) => row.id === insertAfterStepId)
    if (!target) return step.selection.index
    if (target.selection.kind === 'trigger') return -1
    return target.selection.index
  })()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-md">
            <DialogPrimitive.Title className="title-h6">Clone step</DialogPrimitive.Title>
            <DialogPrimitive.Description className="body-2 text-muted-foreground mt-spacing-2">
              Choose where to insert the cloned step(s).
            </DialogPrimitive.Description>
            <div className="gap-spacing-4 mt-spacing-4 flex flex-col">
              <div>
                <p className="body-4 text-foreground mb-spacing-2 font-medium">Insert after</p>
                <AutomationSolidSelect
                  options={insertOptions}
                  value={insertAfterStepId}
                  onChange={setInsertAfterStepId}
                  placeholder="Select position"
                />
              </div>
              <div className="gap-spacing-2 flex flex-col">
                <label className="body-4 text-foreground gap-spacing-2 flex items-center">
                  <input
                    type="radio"
                    name="clone-mode"
                    checked={mode === 'single'}
                    onChange={() => setMode('single')}
                  />
                  This step only
                </label>
                <label className="body-4 text-foreground gap-spacing-2 flex items-center">
                  <input
                    type="radio"
                    name="clone-mode"
                    checked={mode === 'this_and_below'}
                    onChange={() => setMode('this_and_below')}
                  />
                  This step and all below
                </label>
              </div>
            </div>
            <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
              <DialogPrimitive.Close asChild>
                <button type="button" className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3">
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="button"
                className="button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                onClick={() => {
                  onConfirm({ insertAfterActionIndex, mode })
                  onOpenChange(false)
                }}
              >
                Clone
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
