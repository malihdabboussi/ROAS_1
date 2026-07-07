'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AlertTriangle } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { useDebouncedAutosave } from '@/lib/hooks/use-debounced-autosave'
import {
  checkRuleFieldsComplete,
  validateConcreteAction,
  validateTrigger,
} from '../../lib/automation-publishable'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { createAutomation, updateAutomation } from '../../services/automations.service'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
  SpaceAutomation,
} from '../../types/space-schema'
import { ActionBuilder } from './ActionBuilder'
import { findFirstContextIssue } from './automation-catalog'
import { AutomationFlowMap, type FlowSelection } from './AutomationFlowMap'
import { TriggerBuilder } from './TriggerBuilder'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'

export type AutomationRuleEditorPayload = Omit<SpaceAutomation, 'id' | 'created_at' | 'updated_at'>

export type AutomationRuleEditorHandle = {
  isDirty: () => boolean
  saveDraft: () => Promise<void>
  getPayload: () => AutomationRuleEditorPayload
}

function snapshotState(name: string, trigger: AutomationTrigger, actions: AutomationAction[]) {
  return JSON.stringify({ name, trigger, actions })
}

interface AutomationRuleEditorProps {
  spaceId: string
  campaignId: string | null
  editingAutomationId: string | null
  isCreating: boolean
  initial?: SpaceAutomation
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  contactsTriggerPickers: ContactsTriggerPickers
  hideNameField?: boolean
  autoSave?: boolean
  onAutosaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void
  onSave: (data: Omit<SpaceAutomation, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel?: () => void
}

export const AutomationRuleEditor = forwardRef<
  AutomationRuleEditorHandle,
  AutomationRuleEditorProps
>(function AutomationRuleEditor(
  {
    spaceId,
    campaignId,
    editingAutomationId,
    isCreating,
    initial,
    fields,
    roster,
    contactsTriggerPickers,
    hideNameField = false,
    autoSave = false,
    onAutosaveStatusChange,
    onSave,
    onCancel,
  },
  ref,
) {
  const [name, setName] = useState(initial?.name ?? '')
  const enabled = initial?.enabled ?? true
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    initial?.trigger ?? { type: 'status_change', to: '' },
  )
  const [actions, setActions] = useState<AutomationAction[]>(initial?.actions ?? [])
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<FlowSelection>({ kind: 'trigger' })

  /** Clamp selection if the underlying step disappears (e.g. user deletes the selected action). */
  useEffect(() => {
    if (selected.kind === 'action' && selected.index >= actions.length) {
      setSelected({ kind: 'trigger' })
    }
  }, [selected, actions.length])

  const insertActionAt = useCallback(
    (index: number) => {
      setActions((prev) => {
        const safeIndex = Math.max(0, Math.min(index, prev.length))
        const next = [...prev]
        next.splice(safeIndex, 0, { type: 'choose_action' })
        return next
      })
      setSelected({ kind: 'action', index: Math.max(0, Math.min(index, actions.length)) })
    },
    [actions.length],
  )

  const toggleContinuationAt = useCallback((index: number) => {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a
        const current = (a as Record<string, unknown>).continuation
        const nextValue = current === 'after_task_completes' ? undefined : 'after_task_completes'
        return { ...a, continuation: nextValue } as AutomationAction
      }),
    )
  }, [])

  const removeActionAt = useCallback((index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const baselineVersion = `${isCreating ? 'c' : 'e'}-${initial?.id ?? 'none'}`
  const baselineRef = useRef<string>('')

  useLayoutEffect(() => {
    baselineRef.current = snapshotState(
      initial?.name ?? '',
      initial?.trigger ?? { type: 'status_change', to: '' },
      initial?.actions ?? [],
    )
  }, [baselineVersion])

  useEffect(() => {
    if (!hideNameField) return
    setName(initial?.name ?? '')
  }, [hideNameField, initial?.id, initial?.name])

  const concreteActions = actions.filter((a) => a.type !== 'choose_action')
  const canSave = checkRuleFieldsComplete(name.trim(), trigger, actions).ok
  const contextIssue = findFirstContextIssue(trigger, actions)

  const triggerError = useMemo(() => validateTrigger(trigger), [trigger])
  const actionErrors = useMemo<(string | null)[]>(
    () =>
      actions.map((a, index) => {
        const fieldError = validateConcreteAction(a)
        if (fieldError) return fieldError
        if (contextIssue?.index === index) {
          return `Step needs ${contextIssue.missing.join(', ')} context first`
        }
        return null
      }),
    [actions, contextIssue],
  )

  const saveDraft = useCallback(async () => {
    const payload = {
      is_draft: true as const,
      name: name.trim() || 'Untitled draft',
      enabled: false,
      trigger,
      actions,
    }
    if (editingAutomationId) {
      await updateAutomation(spaceId, editingAutomationId, payload)
    } else {
      await createAutomation(spaceId, payload)
    }
  }, [spaceId, editingAutomationId, name, trigger, actions])

  const getPayload = useCallback((): AutomationRuleEditorPayload => {
    return {
      name: name.trim() || 'Untitled flow draft',
      enabled,
      trigger,
      actions: concreteActions,
    }
  }, [concreteActions, enabled, name, trigger])

  const draftSnapshot = useMemo(
    () => snapshotState(name, trigger, actions),
    [name, trigger, actions],
  )

  const persistAutoSave = useCallback(
    async (_snapshot: string) => {
      await onSave(getPayload())
    },
    [getPayload, onSave],
  )

  const { saveStatus: autoSaveStatus } = useDebouncedAutosave({
    value: draftSnapshot,
    getBaseline: () => baselineRef.current,
    setBaseline: (value) => {
      baselineRef.current = value
    },
    enabled: autoSave && Boolean(initial),
    onSave: persistAutoSave,
    errorMessage: 'Failed to save flow',
  })

  useEffect(() => {
    if (!autoSave || !onAutosaveStatusChange) return
    onAutosaveStatusChange(autoSaveStatus)
  }, [autoSave, autoSaveStatus, onAutosaveStatusChange])

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => snapshotState(name, trigger, actions) !== baselineRef.current,
      saveDraft,
      getPayload,
    }),
    [getPayload, name, trigger, actions, saveDraft],
  )

  const handleSubmit = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        enabled,
        trigger,
        actions: concreteActions,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-[65fr_35fr] grid-rows-[minmax(0,1fr)] gap-spacing-10 overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {!hideNameField ? (
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-2 block font-medium">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Send to research agent"
                className="body-2 surface-bg placeholder:text-muted-foreground/60 text-foreground h-spacing-10 rounded-spacing-2 px-spacing-3 w-full border border-[var(--color-border)] outline-none ring-0 focus:border-[var(--color-border)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
          ) : null}

          {selected.kind === 'trigger' ? (
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-2 block font-medium">
                When
              </label>
              <TriggerBuilder
                trigger={trigger}
                onChange={setTrigger}
                fields={fields}
                roster={roster}
                campaignId={campaignId}
                contactsTriggerPickers={contactsTriggerPickers}
                spaceId={spaceId}
              />
            </div>
          ) : (
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-2 block font-medium">
                Step {selected.index + 1}
              </label>
              {contextIssue && contextIssue.index === selected.index ? (
                <div className="banner-glass-amber body-3 gap-spacing-2 mb-spacing-3 flex items-start">
                  <AlertTriangle className="icon-sm mt-0.5 shrink-0" />
                  <span>
                    This step needs {contextIssue.missing.join(', ')} context first. Add a
                    context-building step before it, like creating a task from the trigger.
                  </span>
                </div>
              ) : null}
              <ActionBuilder
                actions={actions}
                trigger={trigger}
                onChange={setActions}
                fields={fields}
                roster={roster}
                campaignId={campaignId}
                singleStepIndex={selected.index}
              />
            </div>
          )}
        </div>

        {!autoSave ? (
          <div className="px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSave || saving}
              className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="relative z-10">
                {saving ? 'Saving...' : initial ? 'Save Changes' : FLOWS_UI.create}
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden pb-spacing-6 pr-spacing-6 pt-spacing-6">
        <AutomationFlowMap
          trigger={trigger}
          actions={actions}
          fields={fields}
          roster={roster}
          selected={selected}
          onSelect={setSelected}
          onAddAt={insertActionAt}
          onRemoveAction={removeActionAt}
          onToggleContinuation={toggleContinuationAt}
          triggerError={triggerError}
          actionErrors={actionErrors}
        />
      </div>
    </div>
  )
})
