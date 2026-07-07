'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FlowBuildPlan } from '@vibey/api-shared/types/flow-builder'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
} from '@/features/spaces/types/space-schema'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import { useDebouncedAutosave } from '@/lib/hooks/use-debounced-autosave'
import type { FlowBuilderPickerSelection } from '@/lib/flows/flow-builder-picker-catalog.utils'
import { buildFlowBuilderCanvasSteps, type FlowBuilderCanvasStep } from '@/lib/flows/flow-builder-canvas.utils'
import {
  defaultAutomationActionForFlowCategory,
  defaultAutomationTriggerForFlowCategory,
  isFlowBuilderTriggerCategory,
  type FlowBuilderStepCategoryId,
} from '@/lib/flows/flow-builder-step-types.utils'
import type { FlowAutomationPayload } from '../../types/flow-automation.types'
import { FlowBuilderAddStepPicker } from './FlowBuilderAddStepPicker'
import { FlowBuilderCanvas } from './FlowBuilderCanvas'
import { FlowBuilderStepCloneDialog } from './FlowBuilderStepCloneDialog'
import { FlowBuilderStepPanel } from './FlowBuilderStepPanel'
import {
  applyTriggerContextSpaceId,
  flowFieldsForTriggerContext,
  isTaskShapedAutomationTrigger,
  readTriggerContextSpaceId,
  resolveTriggerContextSpaceId,
  type FlowTriggerContextSpace,
} from '@/lib/flows/flow-trigger-context-space.utils'
import type { FlowBuilderStepCloneMode } from '@/lib/flows/flow-builder-step-actions.utils'
import {
  cloneFlowBuilderActions,
  deleteFlowBuilderAction,
} from '@/lib/flows/flow-builder-step-actions.utils'
import {
  createEmptyFlowBuilderTestSession,
  type FlowBuilderTestSession,
} from '@/lib/flows/flow-builder-test.utils'

function snapshotRule(trigger: AutomationTrigger, actions: AutomationAction[]) {
  return JSON.stringify({ trigger, actions })
}

export function FlowBuilderStudio({
  flowName,
  plan,
  trigger,
  actions,
  fields,
  roster,
  campaignId,
  spaceId,
  triggerContextSpaces,
  flowSpaceIsConceptSandbox,
  contactsTriggerPickers,
  editable,
  onSaveDraft,
  onAutosaveStatusChange,
  saveRequestId = 0,
  onManualSaveComplete,
  onValidateRequest,
  validateRequestId = 0,
}: {
  flowName: string
  plan?: FlowBuildPlan | null
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  campaignId: string | null
  spaceId: string
  triggerContextSpaces: FlowTriggerContextSpace[]
  flowSpaceIsConceptSandbox: boolean
  contactsTriggerPickers: ContactsTriggerPickers
  editable: boolean
  onSaveDraft?: (data: FlowAutomationPayload) => Promise<void>
  onAutosaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void
  saveRequestId?: number
  onManualSaveComplete?: () => void
  onValidateRequest?: (data: FlowAutomationPayload) => Promise<void>
  validateRequestId?: number
}) {
  const [localTrigger, setLocalTrigger] = useState(trigger)
  const [localActions, setLocalActions] = useState(actions)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [baseline, setBaseline] = useState(() => snapshotRule(trigger, actions))
  const [addStepPickerOpen, setAddStepPickerOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'trigger' | 'action'>('action')
  const [insertAfterStepIndex, setInsertAfterStepIndex] = useState<number | null>(null)
  const [testSession, setTestSession] = useState<FlowBuilderTestSession>(() =>
    createEmptyFlowBuilderTestSession(),
  )
  const [stepLabelOverrides, setStepLabelOverrides] = useState<Record<string, string>>({})
  const [cloneDialogStep, setCloneDialogStep] = useState<FlowBuilderCanvasStep | null>(null)

  const effectiveFields = useMemo(
    () =>
      flowFieldsForTriggerContext({
        trigger: localTrigger,
        flowSpaceId: spaceId,
        flowSpaceIsConceptSandbox,
        spaces: triggerContextSpaces,
        fallbackFields: fields,
      }),
    [fields, flowSpaceIsConceptSandbox, localTrigger, spaceId, triggerContextSpaces],
  )

  const triggerContextSpaceId = useMemo(
    () =>
      resolveTriggerContextSpaceId({
        trigger: localTrigger,
        flowSpaceId: spaceId,
        flowSpaceIsConceptSandbox,
      }),
    [flowSpaceIsConceptSandbox, localTrigger, spaceId],
  )

  useEffect(() => {
    setTestSession((prev) => {
      if (!prev.sampleSpaceId) return prev
      if (!triggerContextSpaceId || prev.sampleSpaceId !== triggerContextSpaceId) {
        return createEmptyFlowBuilderTestSession()
      }
      return prev
    })
  }, [triggerContextSpaceId])

  useEffect(() => {
    if (flowSpaceIsConceptSandbox) return
    if (!isTaskShapedAutomationTrigger(localTrigger)) return
    if (readTriggerContextSpaceId(localTrigger)) return
    setLocalTrigger((current) => applyTriggerContextSpaceId(current, spaceId))
  }, [flowSpaceIsConceptSandbox, localTrigger.type, spaceId])

  const draftSnapshot = useMemo(
    () => snapshotRule(localTrigger, localActions),
    [localActions, localTrigger],
  )
  const isDirty = draftSnapshot !== baseline

  useEffect(() => {
    if (isDirty) return
    setLocalTrigger(trigger)
    setLocalActions(actions)
    setBaseline(snapshotRule(trigger, actions))
  }, [trigger, actions, isDirty])

  const handleSelectCategory = useCallback(
    (categoryId: FlowBuilderStepCategoryId) => {
      if (isFlowBuilderTriggerCategory(categoryId)) {
        const triggerUpdate = defaultAutomationTriggerForFlowCategory(categoryId)
        if (!triggerUpdate) return
        setLocalTrigger(triggerUpdate)
        setSelectedStepId(plan?.trigger?.id ?? 'trigger')
        return
      }

      const insertAt = insertAfterStepIndex ?? localActions.length
      const action = defaultAutomationActionForFlowCategory(categoryId)
      setLocalActions((prev) => {
        const next = [...prev]
        next.splice(insertAt, 0, action)
        return next
      })
      const newStepId = plan?.actions?.[insertAt]?.id ?? `action-${insertAt}`
      setSelectedStepId(newStepId)
      setInsertAfterStepIndex(null)
    },
    [insertAfterStepIndex, localActions.length, plan?.actions, plan?.trigger?.id],
  )

  const handlePickerSelect = useCallback(
    (selection: FlowBuilderPickerSelection) => {
      if (pickerMode === 'trigger') {
        if (selection.kind === 'category') {
          if (!isFlowBuilderTriggerCategory(selection.categoryId)) return
          handleSelectCategory(selection.categoryId)
          return
        }
        if (selection.kind !== 'trigger') return
        setLocalTrigger(selection.trigger)
        setSelectedStepId(plan?.trigger?.id ?? 'trigger')
        setInsertAfterStepIndex(null)
        return
      }

      if (selection.kind === 'category') {
        handleSelectCategory(selection.categoryId)
        return
      }
      if (selection.kind === 'trigger') {
        setLocalTrigger(selection.trigger)
        setSelectedStepId(plan?.trigger?.id ?? 'trigger')
        setInsertAfterStepIndex(null)
        return
      }
      const insertAt = insertAfterStepIndex ?? localActions.length
      setLocalActions((prev) => {
        const next = [...prev]
        next.splice(insertAt, 0, selection.action)
        return next
      })
      const newStepId = plan?.actions?.[insertAt]?.id ?? `action-${insertAt}`
      setSelectedStepId(newStepId)
      setInsertAfterStepIndex(null)
    },
    [
      pickerMode,
      handleSelectCategory,
      insertAfterStepIndex,
      localActions.length,
      plan?.actions,
      plan?.trigger?.id,
    ],
  )

  const openAddStepPicker = useCallback((afterStepIndex: number | null) => {
    setPickerMode('action')
    setInsertAfterStepIndex(afterStepIndex)
    setAddStepPickerOpen(true)
  }, [])

  const openTriggerPicker = useCallback(() => {
    setPickerMode('trigger')
    setInsertAfterStepIndex(null)
    setAddStepPickerOpen(true)
  }, [])

  const handleContinueToNextStep = useCallback((nextStepId: string) => {
    setSelectedStepId(nextStepId)
  }, [])

  const handleRenameStep = useCallback((stepId: string, label: string) => {
    setStepLabelOverrides((current) => ({ ...current, [stepId]: label }))
  }, [])

  const handleDeleteStep = useCallback(
    (step: FlowBuilderCanvasStep) => {
      if (step.selection.kind !== 'action') return
      const sourceActionIndex = step.selection.index
      setLocalActions((current) => deleteFlowBuilderAction(current, sourceActionIndex))
      setSelectedStepId(null)
    },
    [],
  )

  const handleCloneStep = useCallback(
    (
      step: FlowBuilderCanvasStep,
      input: { insertAfterActionIndex: number; mode: FlowBuilderStepCloneMode },
    ) => {
      if (step.selection.kind !== 'action') return
      const sourceActionIndex = step.selection.index
      setLocalActions((current) =>
        cloneFlowBuilderActions({
          actions: current,
          sourceActionIndex,
          mode: input.mode,
          insertAfterActionIndex: input.insertAfterActionIndex,
        }),
      )
      setCloneDialogStep(null)
    },
    [],
  )

  const canvasSteps = useMemo(
    () =>
      buildFlowBuilderCanvasSteps({
        plan,
        trigger: localTrigger,
        actions: localActions,
        fields: effectiveFields,
        roster,
        flowSpaceIsConceptSandbox,
        testSession,
        stepLabelOverrides,
      }),
    [
      plan,
      localTrigger,
      localActions,
      effectiveFields,
      roster,
      flowSpaceIsConceptSandbox,
      testSession,
      stepLabelOverrides,
    ],
  )

  const selectedStep = useMemo(
    () => canvasSteps.find((step) => step.id === selectedStepId) ?? null,
    [canvasSteps, selectedStepId],
  )

  const showStepPanel = selectedStep && !selectedStep.isPlaceholder

  useEffect(() => {
    if (selectedStepId && !canvasSteps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(null)
    }
  }, [canvasSteps, selectedStepId])

  const getPayload = useCallback(
    (): FlowAutomationPayload => ({
      name: flowName,
      trigger: localTrigger,
      actions: localActions,
    }),
    [flowName, localActions, localTrigger],
  )

  const persistDraft = useCallback(async () => {
    if (!onSaveDraft) return
    await onSaveDraft(getPayload())
  }, [getPayload, onSaveDraft])

  const { saveStatus } = useDebouncedAutosave({
    value: draftSnapshot,
    getBaseline: () => baseline,
    setBaseline,
    enabled: editable && Boolean(onSaveDraft),
    onSave: persistDraft,
    errorMessage: 'Failed to save flow',
  })

  useEffect(() => {
    if (!onAutosaveStatusChange) return
    onAutosaveStatusChange(saveStatus)
  }, [onAutosaveStatusChange, saveStatus])

  useEffect(() => {
    if (!saveRequestId) return
    void (async () => {
      await persistDraft()
      onManualSaveComplete?.()
    })()
  }, [saveRequestId, persistDraft, onManualSaveComplete])

  useEffect(() => {
    if (!validateRequestId || !onValidateRequest) return
    void onValidateRequest(getPayload())
  }, [validateRequestId, onValidateRequest, getPayload])

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <div className="flow-builder-canvas-scroll min-h-0 flex-1 overflow-y-auto">
        <p className="body-4 text-muted-foreground flow-builder-canvas-hint text-center">
          Configure your flow or ask Loop in chat to add or change steps
        </p>

        <FlowBuilderCanvas
          steps={canvasSteps}
          selectedId={selectedStepId}
          onSelectStep={setSelectedStepId}
          editable={editable}
          onInsertAfterStep={editable ? (stepIndex) => openAddStepPicker(stepIndex) : undefined}
          onAddTrigger={editable ? openTriggerPicker : undefined}
          triggerPickerOpen={addStepPickerOpen && pickerMode === 'trigger'}
          onRenameStep={handleRenameStep}
          onDeleteStep={handleDeleteStep}
          onRequestCloneStep={editable ? setCloneDialogStep : undefined}
        />
      </div>

      {showStepPanel ? (
        <FlowBuilderStepPanel
          step={selectedStep}
          canvasSteps={canvasSteps}
          trigger={localTrigger}
          actions={localActions}
          fields={effectiveFields}
          roster={roster}
          campaignId={campaignId}
          spaceId={spaceId}
          triggerContextSpaces={triggerContextSpaces}
          flowSpaceIsConceptSandbox={flowSpaceIsConceptSandbox}
          contactsTriggerPickers={contactsTriggerPickers}
          stepLabelOverride={stepLabelOverrides[selectedStep.id] ?? null}
          testSession={testSession}
          onTestSessionChange={setTestSession}
          onContinueToNextStep={handleContinueToNextStep}
          onRenameStep={handleRenameStep}
          onDeleteStep={handleDeleteStep}
          onCloneStep={handleCloneStep}
          planTriggerTitle={
            plan?.trigger?.payload &&
            typeof plan.trigger.payload === 'object' &&
            'type' in plan.trigger.payload &&
            plan.trigger.payload.type === localTrigger.type
              ? plan.trigger.title
              : undefined
          }
          editable={editable}
          onChangeTrigger={setLocalTrigger}
          onChangeActions={setLocalActions}
          onClose={() => setSelectedStepId(null)}
        />
      ) : null}
      <FlowBuilderAddStepPicker
        open={addStepPickerOpen}
        onClose={() => {
          setAddStepPickerOpen(false)
          setInsertAfterStepIndex(null)
        }}
        onSelect={handlePickerSelect}
        allowTriggers={pickerMode === 'trigger'}
        triggersOnly={pickerMode === 'trigger'}
      />
      {cloneDialogStep ? (
        <FlowBuilderStepCloneDialog
          open
          step={cloneDialogStep}
          canvasSteps={canvasSteps}
          onOpenChange={(open) => {
            if (!open) setCloneDialogStep(null)
          }}
          onConfirm={(input) => handleCloneStep(cloneDialogStep, input)}
        />
      ) : null}
    </div>
  )
}
