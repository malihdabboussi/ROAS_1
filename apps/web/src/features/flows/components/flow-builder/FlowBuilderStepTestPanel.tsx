'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import type { AutomationAction, AutomationTrigger } from '@/features/spaces/types/space-schema'
import {
  validateConcreteAction,
  validateTrigger,
} from '@/lib/flows/automation-publishable'
import type { FlowBuilderCanvasStep } from '@/lib/flows/flow-builder-canvas.utils'
import {
  buildFlowBuilderSampleTask,
  buildFlowTestTemplateContext,
  buildTriggerSampleOutputLines,
  createEmptyFlowBuilderTestSession,
  filterSpaceItemsForTrigger,
  isFlowBuilderSampleTask,
  previewAutomationActionOutput,
  stepRequiresTaskSample,
  type FlowBuilderTestSession,
  type FlowBuilderTestStepResult,
} from '@/lib/flows/flow-builder-test.utils'
import { isTaskShapedAutomationTrigger } from '@/lib/flows/flow-trigger-context-space.utils'
import { fetchSpaceItems } from '@/lib/spaces/spaces-api'
import type { SpaceFieldDef } from '@/lib/spaces/spaces-api'
import type { SpaceItem } from '@/lib/spaces/space-item-types'
import { cn } from '@/lib/utils/cn'

function sortTasksByRecent(items: SpaceItem[]): SpaceItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export function FlowBuilderStepTestPanel({
  step,
  trigger,
  actions,
  fields: _fields,
  roster,
  contextSpaceId,
  contextSpaceTitle,
  testSession,
  onTestSessionChange,
  editable,
}: {
  step: FlowBuilderCanvasStep
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: SpaceFieldDef[]
  roster: TeamRosterEntry[]
  contextSpaceId: string | null
  contextSpaceTitle: string | null
  testSession: FlowBuilderTestSession
  onTestSessionChange: (next: FlowBuilderTestSession) => void
  editable: boolean
}) {
  const [running, setRunning] = useState(false)
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [taskOptions, setTaskOptions] = useState<SpaceItem[]>([])
  const [noRealTasksFound, setNoRealTasksFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const stepResult = testSession.stepResults[step.id] ?? null
  const requiresTaskSample = stepRequiresTaskSample({
    stepKind: step.selection.kind,
    trigger,
  })
  const showTaskPicker =
    step.selection.kind === 'trigger' && isTaskShapedAutomationTrigger(trigger) && contextSpaceId

  const selectedItem = testSession.sampleItem

  const sampleMatchesContextSpace =
    Boolean(selectedItem) &&
    Boolean(contextSpaceId) &&
    testSession.sampleSpaceId === contextSpaceId &&
    (selectedItem?.space_id === contextSpaceId || isFlowBuilderSampleTask(selectedItem!))

  const recordOptions = useMemo((): AutomationSolidOption[] => {
    return taskOptions.map((item) => ({
      value: item.id,
      label: isFlowBuilderSampleTask(item) ? 'Sample task (preview)' : item.title,
      description: String(item.status),
    }))
  }, [taskOptions])

  useEffect(() => {
    setTasksLoaded(false)
    setTaskOptions([])
    setNoRealTasksFound(false)
    setLoadError(null)
  }, [contextSpaceId])

  useEffect(() => {
    if (
      testSession.sampleSpaceId &&
      contextSpaceId &&
      testSession.sampleSpaceId !== contextSpaceId
    ) {
      onTestSessionChange(createEmptyFlowBuilderTestSession())
    }
  }, [contextSpaceId, onTestSessionChange, testSession.sampleSpaceId])

  const handleSelectTask = useCallback(
    (item: SpaceItem) => {
      onTestSessionChange({
        sampleItem: item,
        sampleSpaceId: contextSpaceId,
        stepResults: {},
      })
    },
    [contextSpaceId, onTestSessionChange],
  )

  const applyStepResult = useCallback(
    (result: FlowBuilderTestStepResult, item?: SpaceItem | null) => {
      onTestSessionChange({
        ...testSession,
        sampleItem: item ?? testSession.sampleItem,
        sampleSpaceId: contextSpaceId ?? testSession.sampleSpaceId,
        stepResults: {
          ...testSession.stepResults,
          [step.id]: result,
        },
      })
    },
    [contextSpaceId, onTestSessionChange, step.id, testSession],
  )

  const loadTasksFromSpace = useCallback(async () => {
    if (!contextSpaceId) {
      setLoadError('Select a space in Setup before running a test.')
      return []
    }
    const rows = await fetchSpaceItems(contextSpaceId, {
      item_kind: 'task',
      parent_scope: 'top_level',
      limit: 50,
    })
    return sortTasksByRecent(
      filterSpaceItemsForTrigger(
        rows.filter((item) => item.space_id === contextSpaceId),
        trigger,
      ),
    )
  }, [contextSpaceId, trigger])

  const updateRecordOutput = useCallback(
    (item: SpaceItem) => {
      if (!contextSpaceId) return
      const configError = validateTrigger(trigger)
      applyStepResult(
        {
          status: configError ? 'fail' : 'pass',
          message: isFlowBuilderSampleTask(item)
            ? 'No tasks found in this space. Preview uses the sample record below.'
            : 'Record selected.',
          outputLines: buildTriggerSampleOutputLines({ item, spaceId: contextSpaceId }),
        },
        item,
      )
    },
    [applyStepResult, contextSpaceId, trigger],
  )

  const runTest = useCallback(async () => {
    setRunning(true)
    setLoadError(null)
    try {
      if (step.selection.kind === 'trigger') {
        if (requiresTaskSample && !contextSpaceId) {
          const message = 'Select a space in Setup before running a test.'
          applyStepResult({ status: 'fail', message, outputLines: [] })
          toast.error(message)
          return
        }

        if (showTaskPicker) {
          const tasks = await loadTasksFromSpace()
          const usingSampleOnly = tasks.length === 0
          const sampleTask = buildFlowBuilderSampleTask({
            spaceId: contextSpaceId!,
            trigger,
          })
          const records = usingSampleOnly ? [sampleTask] : tasks

          setTaskOptions(records)
          setTasksLoaded(true)
          setNoRealTasksFound(usingSampleOnly)

          const picked =
            sampleMatchesContextSpace && selectedItem
              ? records.find((row) => row.id === selectedItem.id) ?? records[0]!
              : records[0]!

          if (!sampleMatchesContextSpace || selectedItem?.id !== picked.id) {
            onTestSessionChange({
              sampleItem: picked,
              sampleSpaceId: contextSpaceId,
              stepResults: {},
            })
          }

          const configError = validateTrigger(trigger)
          applyStepResult(
            {
              status: configError ? 'fail' : 'pass',
              message: configError
                ? configError
                : usingSampleOnly
                  ? 'No tasks found in this space. Select the sample record to preview this step.'
                  : `Loaded ${records.length} record${records.length === 1 ? '' : 's'}. Select one to preview output.`,
              outputLines: buildTriggerSampleOutputLines({
                item: picked,
                spaceId: contextSpaceId!,
              }),
            },
            picked,
          )
          if (configError) toast.error(configError)
          else if (usingSampleOnly) toast.message('No tasks found — using sample record')
          else toast.success('Records loaded')
          return
        }

        const error = validateTrigger(trigger)
        if (error) {
          applyStepResult({ status: 'fail', message: error, outputLines: [] })
          toast.error(error)
          return
        }
        applyStepResult({
          status: 'pass',
          message: 'Trigger configuration looks valid.',
          outputLines: [],
        })
        toast.success('Trigger step looks valid')
        return
      }

      const action = actions[step.selection.index]
      if (!action || action.type === 'choose_action') {
        const message = 'Choose an action type in Setup before testing.'
        applyStepResult({ status: 'fail', message, outputLines: [] })
        toast.error(message)
        return
      }

      const error = validateConcreteAction(action)
      if (error) {
        applyStepResult({ status: 'fail', message: error, outputLines: [] })
        toast.error(error)
        return
      }

      if (requiresTaskSample && (!testSession.sampleItem || !sampleMatchesContextSpace)) {
        const message = contextSpaceId
          ? 'Run the trigger test first and pick a record from this space.'
          : 'Select a space in Setup before testing.'
        applyStepResult({ status: 'fail', message, outputLines: [] })
        toast.error(message)
        return
      }

      const priorOutputs = Object.values(testSession.stepResults)
        .filter((row) => row.status === 'pass')
        .map((row) => ({ output: row.outputLines }))
      const ctx = buildFlowTestTemplateContext({
        item: testSession.sampleItem!,
        spaceTitle: contextSpaceTitle ?? 'Space',
        roster,
        trigger,
        priorStepOutputs: priorOutputs,
      })
      applyStepResult({
        status: 'pass',
        message:
          action.type === 'send_to_agent' || action.type === 'send_to_agents'
            ? 'Step preview generated. Live agent runs after publish.'
            : 'Step preview generated from your selected record.',
        outputLines: previewAutomationActionOutput(action, ctx),
      })
      toast.success('Step preview ready')
    } catch {
      const message = 'Could not load tasks from this space.'
      setLoadError(message)
      applyStepResult({ status: 'fail', message, outputLines: [] })
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }, [
    actions,
    applyStepResult,
    contextSpaceId,
    contextSpaceTitle,
    loadTasksFromSpace,
    onTestSessionChange,
    requiresTaskSample,
    roster,
    sampleMatchesContextSpace,
    selectedItem,
    showTaskPicker,
    step.selection,
    testSession,
    trigger,
  ])

  const handleRecordChange = (recordId: string) => {
    const item = taskOptions.find((row) => row.id === recordId)
    if (!item) return
    if (contextSpaceId && item.space_id !== contextSpaceId && !isFlowBuilderSampleTask(item)) {
      return
    }
    handleSelectTask(item)
    updateRecordOutput(item)
  }

  const outputLines = stepResult?.outputLines ?? []

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="section-card p-spacing-4">
        <p className="body-3 text-foreground font-medium">Test this step</p>
        <p className="body-4 text-muted-foreground mt-spacing-2">
          {showTaskPicker
            ? `Run test to pull recent tasks from ${contextSpaceTitle ?? 'the configured space'}, then pick a record.`
            : 'Run test to validate this step and preview the data it would use.'}
        </p>
        {editable ? (
          <div className="mt-spacing-3 flex justify-center">
            <button
              type="button"
              disabled={running}
              onClick={() => void runTest()}
              className="button-compact button-glass-primary"
            >
              {running ? (
                <span className="gap-spacing-2 flex items-center">
                  <Loader2 className="icon-xs animate-spin" />
                  Running…
                </span>
              ) : (
                'Run test'
              )}
            </button>
          </div>
        ) : null}
      </div>

      {loadError ? <p className="body-4 text-destructive">{loadError}</p> : null}

      {showTaskPicker && tasksLoaded ? (
        <div className="section-card gap-spacing-3 p-spacing-4 flex flex-col">
          <div>
            <p className="body-4 text-foreground mb-spacing-2 font-medium">Record</p>
            <AutomationSolidSelect
              options={recordOptions}
              value={selectedItem?.id ?? recordOptions[0]?.value ?? ''}
              onChange={handleRecordChange}
              placeholder="Select a record"
              disabled={!editable}
            />
          </div>
          {noRealTasksFound ? (
            <p className="body-4 text-muted-foreground">
              No tasks found in {contextSpaceTitle ?? 'this space'}. Use the sample record above
              to preview and continue testing.
            </p>
          ) : null}
        </div>
      ) : null}

      {stepResult ? (
        <div
          className={cn(
            'section-card gap-spacing-3 p-spacing-4',
            stepResult.status === 'pass'
              ? 'border-primary/30 bg-primary/5'
              : 'border-destructive/30 bg-destructive/5',
          )}
        >
          <div className="gap-spacing-2 flex items-start">
            {stepResult.status === 'pass' ? (
              <CheckCircle2 className="icon-sm text-primary mt-0.5 shrink-0" />
            ) : (
              <XCircle className="icon-sm text-destructive mt-0.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground font-medium">Output</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">{stepResult.message}</p>
            </div>
          </div>
          {outputLines.length > 0 ? (
            <dl className="gap-spacing-2 flex flex-col">
              {outputLines.map((line) => (
                <div key={`${line.key}-${line.value}`} className="gap-spacing-2 flex min-w-0">
                  <dt className="body-4 text-muted-foreground w-28 shrink-0">{line.key}</dt>
                  <dd className="body-4 text-foreground min-w-0 flex-1 whitespace-pre-wrap break-words">
                    {line.href ? (
                      <Link href={line.href} className="text-primary hover:underline">
                        {line.value}
                      </Link>
                    ) : (
                      line.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
