'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { ActionBuilder } from '@/features/spaces/components/automations/ActionBuilder'
import { TriggerBuilder } from '@/features/spaces/components/automations/TriggerBuilder'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
} from '@/features/spaces/types/space-schema'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import {
  getFlowBuilderStepLabel,
  getFlowBuilderStepSummary,
} from '@/lib/flows/automation-flow-step-summary.utils'
import {
  flowBuilderBadgeClass,
  type FlowBuilderCanvasStep,
} from '@/lib/flows/flow-builder-canvas.utils'
import type { FlowBuilderStepPhase } from '@/lib/flows/flow-builder-step-phase.utils'
import {
  isFlowBuilderStepConfigureComplete,
  isFlowBuilderStepSetupComplete,
} from '@/lib/flows/flow-builder-step-phase.utils'
import type { FlowBuilderStepCloneMode } from '@/lib/flows/flow-builder-step-actions.utils'
import {
  isTaskShapedAutomationTrigger,
  resolveTriggerContextSpaceId,
  type FlowTriggerContextSpace,
} from '@/lib/flows/flow-trigger-context-space.utils'
import {
  isFlowBuilderStepTested,
  type FlowBuilderTestSession,
} from '@/lib/flows/flow-builder-test.utils'
import { cn } from '@/lib/utils/cn'
import { FlowBuilderStepActionsMenu } from './FlowBuilderStepActionsMenu'
import { FlowBuilderStepCloneDialog } from './FlowBuilderStepCloneDialog'
import { FlowBuilderStepIcon } from './FlowBuilderStepIcon'
import { FlowBuilderStepSetupPanel } from './FlowBuilderStepSetupPanel'
import { FlowBuilderStepTestPanel } from './FlowBuilderStepTestPanel'
import { FlowBuilderStepWizardNav } from './FlowBuilderStepWizardNav'

export function FlowBuilderStepPanel({
  step,
  canvasSteps,
  trigger,
  actions,
  fields,
  roster,
  campaignId,
  spaceId,
  triggerContextSpaces,
  flowSpaceIsConceptSandbox,
  contactsTriggerPickers,
  planTriggerTitle,
  stepLabelOverride,
  testSession,
  onTestSessionChange,
  onContinueToNextStep,
  onRenameStep,
  onDeleteStep,
  onCloneStep,
  editable,
  onChangeTrigger,
  onChangeActions,
  onClose,
}: {
  step: FlowBuilderCanvasStep
  canvasSteps: FlowBuilderCanvasStep[]
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  campaignId: string | null
  spaceId: string
  triggerContextSpaces: FlowTriggerContextSpace[]
  flowSpaceIsConceptSandbox: boolean
  contactsTriggerPickers: ContactsTriggerPickers
  planTriggerTitle?: string
  stepLabelOverride?: string | null
  testSession: FlowBuilderTestSession
  onTestSessionChange: (next: FlowBuilderTestSession) => void
  onContinueToNextStep: (nextStepId: string) => void
  onRenameStep: (stepId: string, label: string) => void
  onDeleteStep: (step: FlowBuilderCanvasStep) => void
  onCloneStep: (
    step: FlowBuilderCanvasStep,
    input: { insertAfterActionIndex: number; mode: FlowBuilderStepCloneMode },
  ) => void
  editable: boolean
  onChangeTrigger: (next: AutomationTrigger) => void
  onChangeActions: (next: AutomationAction[]) => void
  onClose: () => void
}) {
  const [phase, setPhase] = useState<FlowBuilderStepPhase>('setup')
  const [cloneOpen, setCloneOpen] = useState(false)

  useEffect(() => {
    setPhase('setup')
  }, [step.id])

  const Icon = step.icon
  const badgeClass = flowBuilderBadgeClass(step.badgeVariant)
  const label = useMemo(
    () =>
      stepLabelOverride ??
      getFlowBuilderStepLabel({
        selection: step.selection,
        trigger,
        actions,
        fields,
        roster,
        planTriggerTitle,
      }),
    [step.selection, trigger, actions, fields, roster, planTriggerTitle, stepLabelOverride],
  )
  const summary = useMemo(
    () =>
      getFlowBuilderStepSummary({
        selection: step.selection,
        trigger,
        actions,
        fields,
        roster,
        fallback: step.config,
      }),
    [step.selection, step.config, trigger, actions, fields, roster],
  )

  const setupComplete = isFlowBuilderStepSetupComplete({
    step,
    trigger,
    actions,
    flowSpaceIsConceptSandbox,
  })
  const configureComplete = isFlowBuilderStepConfigureComplete({ step, trigger, actions })
  const stepTested = isFlowBuilderStepTested(testSession, step.id)
  const configureSpaceId = resolveTriggerContextSpaceId({
    trigger,
    flowSpaceId: spaceId,
    flowSpaceIsConceptSandbox,
  })
  const taskTriggerNeedsContextSpace =
    step.selection.kind === 'trigger' && isTaskShapedAutomationTrigger(trigger) && !configureSpaceId
  const triggerBuilderSpaceId = configureSpaceId ?? spaceId
  const contextSpaceTitle =
    triggerContextSpaces.find((row) => row.id === configureSpaceId)?.title ?? null
  const currentStepIndex = canvasSteps.findIndex((row) => row.id === step.id)
  const nextStep = currentStepIndex >= 0 ? canvasSteps[currentStepIndex + 1] : null
  const canDelete = step.selection.kind === 'action'
  const canClone = step.selection.kind === 'action'

  const handleContinue = () => {
    if (phase === 'setup') {
      setPhase('configure')
      return
    }
    if (phase === 'configure') {
      setPhase('test')
    }
  }

  const handleBack = () => {
    if (phase === 'test') {
      setPhase('configure')
      return
    }
    if (phase === 'configure') {
      setPhase('setup')
      return
    }
    onClose()
  }

  const handleContinueToNext = () => {
    if (!nextStep) {
      onClose()
      return
    }
    onContinueToNextStep(nextStep.id)
  }

  const handleRename = () => {
    const next = window.prompt('Rename step', label)
    if (!next?.trim()) return
    onRenameStep(step.id, next.trim())
  }

  const continueLabel =
    phase === 'test'
      ? nextStep
        ? `Continue to Step ${nextStep.stepNumber}`
        : 'Done'
      : 'Continue'

  return (
    <aside className="flow-builder-step-panel">
      <div className="border-border gap-spacing-3 px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
        <FlowBuilderStepIcon
          Icon={Icon}
          badgeVariant={step.badgeVariant}
          logoSrc={step.logoSrc}
          avatarSrc={step.avatarSrc}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground truncate font-semibold">{label}</p>
          <span className={cn('badge-glass mt-spacing-1', badgeClass)}>{step.typeLabel}</span>
        </div>
        {editable ? (
          <FlowBuilderStepActionsMenu
            canDelete={canDelete}
            canClone={canClone}
            onRename={handleRename}
            onDelete={() => onDeleteStep(step)}
            onClone={() => setCloneOpen(true)}
          />
        ) : null}
        <button type="button" onClick={onClose} className="btn-icon-bare shrink-0" aria-label="Close">
          <X className="icon-sm" />
        </button>
      </div>

      <FlowBuilderStepWizardNav
        activePhase={phase}
        setupComplete={setupComplete}
        configureComplete={configureComplete}
        testComplete={stepTested}
        onSelectPhase={setPhase}
      />

      <div className="flow-builder-step-panel-body gap-spacing-4 p-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {phase === 'setup' ? (
          <FlowBuilderStepSetupPanel
            step={step}
            trigger={trigger}
            actions={actions}
            fields={fields}
            roster={roster}
            triggerContextSpaces={triggerContextSpaces}
            flowSpaceId={spaceId}
            flowSpaceIsConceptSandbox={flowSpaceIsConceptSandbox}
            editable={editable}
            onChangeTrigger={onChangeTrigger}
            onChangeActions={onChangeActions}
          />
        ) : null}

        {phase === 'configure' ? (
          <>
            <div className="section-card body-3 text-muted-foreground rounded-spacing-2 p-spacing-3">
              {summary}
            </div>
            {editable ? (
              taskTriggerNeedsContextSpace ? (
                <div className="section-card body-3 text-muted-foreground rounded-spacing-2 p-spacing-3">
                  Select a space in Setup before configuring task fields.
                </div>
              ) : step.selection.kind === 'trigger' ? (
                <TriggerBuilder
                  trigger={trigger}
                  onChange={onChangeTrigger}
                  fields={fields}
                  roster={roster}
                  campaignId={campaignId}
                  contactsTriggerPickers={contactsTriggerPickers}
                  spaceId={triggerBuilderSpaceId}
                  mode="fields"
                />
              ) : (
                <ActionBuilder
                  actions={actions}
                  trigger={trigger}
                  onChange={onChangeActions}
                  fields={fields}
                  roster={roster}
                  campaignId={campaignId}
                  singleStepIndex={step.selection.index}
                  hideTypeSelect
                />
              )
            ) : (
              <fieldset disabled className="m-0 min-w-0 border-0 p-0">
                {taskTriggerNeedsContextSpace ? (
                  <div className="section-card body-3 text-muted-foreground rounded-spacing-2 p-spacing-3">
                    Select a space in Setup before configuring task fields.
                  </div>
                ) : step.selection.kind === 'trigger' ? (
                  <TriggerBuilder
                    trigger={trigger}
                    onChange={() => {}}
                    fields={fields}
                    roster={roster}
                    campaignId={campaignId}
                    contactsTriggerPickers={contactsTriggerPickers}
                    spaceId={triggerBuilderSpaceId}
                    mode="fields"
                  />
                ) : (
                  <ActionBuilder
                    actions={actions}
                    trigger={trigger}
                    onChange={() => {}}
                    fields={fields}
                    roster={roster}
                    campaignId={campaignId}
                    singleStepIndex={step.selection.index}
                    hideTypeSelect
                  />
                )}
              </fieldset>
            )}
          </>
        ) : null}

        {phase === 'test' ? (
          <FlowBuilderStepTestPanel
            step={step}
            trigger={trigger}
            actions={actions}
            fields={fields}
            roster={roster}
            contextSpaceId={configureSpaceId}
            contextSpaceTitle={contextSpaceTitle}
            testSession={testSession}
            onTestSessionChange={onTestSessionChange}
            editable={editable}
          />
        ) : null}
      </div>

      {editable ? (
        <div className="flow-builder-step-panel-footer">
          <button
            type="button"
            className="button-compact button-glass-neutral gap-spacing-2"
            onClick={handleBack}
          >
            <ArrowLeft className="icon-xs" />
            Back
          </button>
          <button
            type="button"
            className="button-compact button-glass-primary gap-spacing-2"
            onClick={phase === 'test' ? handleContinueToNext : handleContinue}
          >
            {continueLabel}
          </button>
        </div>
      ) : null}

      {canClone ? (
        <FlowBuilderStepCloneDialog
          open={cloneOpen}
          step={step}
          canvasSteps={canvasSteps}
          onOpenChange={setCloneOpen}
          onConfirm={(input) => onCloneStep(step, input)}
        />
      ) : null}
    </aside>
  )
}
