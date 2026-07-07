'use client'

import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  flowBuilderBadgeClass,
  type FlowBuilderBadgeVariant,
  type FlowBuilderCanvasStep,
} from '@/lib/flows/flow-builder-canvas.utils'
import type { FlowBuilderStepConfigurationStatus } from '@/lib/flows/flow-builder-step-phase.utils'
import { FlowBuilderStepActionsMenu } from './FlowBuilderStepActionsMenu'
import { FlowBuilderStepIcon } from './FlowBuilderStepIcon'

function connectorClass(from: FlowBuilderBadgeVariant, to: FlowBuilderBadgeVariant): string {
  return `flow-builder-connector flow-builder-connector-from-${from} flow-builder-connector-to-${to}`
}

function FlowBuilderStepStatusBadge({
  status,
}: {
  status: FlowBuilderStepConfigurationStatus | undefined
}) {
  if (status === 'complete') {
    return (
      <span
        className="flow-builder-step-status flow-builder-step-status-complete shrink-0"
        aria-label="Tested and configured"
        title="Tested and configured"
      >
        <CheckCircle2 className="icon-xs" />
      </span>
    )
  }
  if (status === 'needs_configure' || status === 'needs_setup') {
    return (
      <span
        className="flow-builder-step-status flow-builder-step-status-warning shrink-0"
        aria-label="Needs attention"
        title="Needs attention"
      >
        <AlertTriangle className="icon-xs" />
      </span>
    )
  }
  return null
}

export function FlowBuilderCanvas({
  steps,
  selectedId,
  onSelectStep,
  editable,
  onInsertAfterStep,
  onAddTrigger,
  triggerPickerOpen = false,
  onRenameStep,
  onDeleteStep,
  onRequestCloneStep,
}: {
  steps: FlowBuilderCanvasStep[]
  selectedId: string | null
  onSelectStep: (stepId: string) => void
  editable?: boolean
  onInsertAfterStep?: (stepIndex: number) => void
  onAddTrigger?: () => void
  triggerPickerOpen?: boolean
  onRenameStep?: (stepId: string, label: string) => void
  onDeleteStep?: (step: FlowBuilderCanvasStep) => void
  onRequestCloneStep?: (step: FlowBuilderCanvasStep) => void
}) {
  if (steps.length === 0) {
    return (
      <div className="flow-builder-canvas-empty">
        <p className="body-3 text-muted-foreground">Loop is drafting your first step…</p>
      </div>
    )
  }

  return (
    <div className="flow-builder-canvas-root">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isSelected = selectedId === step.id
        const badgeClass = flowBuilderBadgeClass(step.badgeVariant)
        const prevVariant = index > 0 ? steps[index - 1]?.badgeVariant : null

        return (
          <div key={step.id} className="flow-builder-canvas-chain">
            {index > 0 && prevVariant ? (
              <div
                className={connectorClass(prevVariant, step.badgeVariant)}
                aria-hidden
              >
                <span
                  className={cn(
                    'flow-builder-connector-dot',
                    `flow-builder-connector-dot-${step.badgeVariant}`,
                  )}
                />
              </div>
            ) : null}

            <div className="flow-builder-step-wrap">
              <span className="flow-builder-step-number">
                STEP {step.stepNumber}
                <FlowBuilderStepStatusBadge status={step.configurationStatus} />
              </span>
              {step.isPlaceholder && editable && onAddTrigger ? (
                <button
                  type="button"
                  onClick={onAddTrigger}
                  className={cn(
                    'flow-builder-add-step w-full justify-center',
                    triggerPickerOpen && 'flow-builder-add-step-open',
                  )}
                >
                  <Plus className="icon-xs" />
                  Select trigger
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flow-builder-step-button',
                    `flow-builder-step-button-${step.badgeVariant}`,
                    step.isHumanGate && 'flow-builder-step-button-human',
                    step.isCondition && 'flow-builder-step-button-condition',
                    step.configurationStatus === 'needs_setup' &&
                      'flow-builder-step-button-incomplete',
                    isSelected && 'flow-builder-step-button-selected',
                    isSelected && `flow-builder-step-button-selected-${step.badgeVariant}`,
                  )}
                >
                  <FlowBuilderStepIcon
                    Icon={Icon}
                    badgeVariant={step.badgeVariant}
                    logoSrc={step.logoSrc}
                    avatarSrc={step.avatarSrc}
                    humanGate={step.isHumanGate}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-2 text-foreground truncate font-semibold">{step.label}</span>
                      {step.isHumanGate ? (
                        <span className="badge-glass badge-glass-purple typo-caption font-semibold uppercase tracking-wide">
                          Human gate
                        </span>
                      ) : null}
                    </span>
                    <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                      {step.config}
                    </span>
                  </span>
                  <span className="flow-builder-step-button-trailing">
                    <span className={cn('badge-glass flow-builder-step-type-badge', badgeClass)}>
                      {step.typeLabel}
                    </span>
                    {editable && onRenameStep && onDeleteStep ? (
                      <FlowBuilderStepActionsMenu
                        canDelete={step.selection.kind === 'action'}
                        canClone={step.selection.kind === 'action'}
                        onRename={() => {
                          const next = window.prompt('Rename step', step.label)
                          if (!next?.trim()) return
                          onRenameStep(step.id, next.trim())
                        }}
                        onDelete={() => onDeleteStep(step)}
                        onClone={() => onRequestCloneStep?.(step)}
                      />
                    ) : null}
                  </span>
                </button>
              )}
              {step.loopTargetStepNumber ? (
                <div className="flow-builder-loop-branch" aria-hidden>
                  <span className="flow-builder-loop-branch-label">
                    On reject → Step {step.loopTargetStepNumber}
                  </span>
                </div>
              ) : null}
              {step.branchThenStepNumber ? (
                <div className="flow-builder-loop-branch" aria-hidden>
                  <span className="flow-builder-loop-branch-label">
                    Then → Step {step.branchThenStepNumber}
                    {step.branchElseStepNumber ? ` · Else → Step ${step.branchElseStepNumber}` : ''}
                  </span>
                </div>
              ) : null}
            </div>

            {editable && onInsertAfterStep && !step.isPlaceholder ? (
              <div className="flow-builder-inline-add-wrap">
                <button
                  type="button"
                  className="flow-builder-inline-add"
                  aria-label={`Add step after step ${step.stepNumber}`}
                  onClick={() => onInsertAfterStep(index)}
                >
                  <Plus className="icon-xs" />
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
