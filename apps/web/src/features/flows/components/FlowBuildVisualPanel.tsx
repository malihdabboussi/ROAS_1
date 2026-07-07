'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Save, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { FlowBuildSessionSummary } from '@vibey/api-shared/types/flow-builder'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import type { FieldDef } from '@/features/spaces/types/space-schema'
import type {
  AutomationAction,
  AutomationTrigger,
} from '@/features/spaces/types/space-schema'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import { flowBuildPlanToAutomationRule } from '@/lib/flows/flow-build-plan-automation.utils'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  SaveIndicator,
  type SaveIndicatorStatus,
} from '@/components/ui/feedback/SaveIndicator'
import {
  FLOW_VALIDATION_UI,
  buildFlowValidationLoopPrompt,
  formatFlowValidationError,
} from '../config/errors.config'
import type { FlowAutomation, FlowAutomationPayload } from '../types/flow-automation.types'
import type { FlowValidationResult } from '../services/flows.service'
import { FlowBuilderStudio } from './flow-builder/FlowBuilderStudio'

interface FlowBuildVisualPanelProps {
  summary: FlowBuildSessionSummary | null
  loading?: boolean
  spaceId: string
  campaignId: string | null
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  contactsTriggerPickers: ContactsTriggerPickers
  compiledFlow?: FlowAutomation | null
  draftFlowId?: string | null
  onSaveDraft?: (data: FlowAutomationPayload) => Promise<FlowAutomation | void>
  onValidateDraft?: (data: FlowAutomationPayload) => Promise<FlowValidationResult>
  onAskLoopToFix?: (prompt: string) => void
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function FlowBuildVisualPanel({
  summary,
  loading,
  spaceId,
  campaignId,
  fields,
  roster,
  contactsTriggerPickers,
  compiledFlow,
  draftFlowId,
  onSaveDraft,
  onValidateDraft,
  onAskLoopToFix,
}: FlowBuildVisualPanelProps) {
  const [autosaveStatus, setAutosaveStatus] = useState<SaveIndicatorStatus>('idle')
  const [saveRequestId, setSaveRequestId] = useState(0)
  const [validateRequestId, setValidateRequestId] = useState(0)
  const [busy, setBusy] = useState<'save' | 'validate' | null>(null)
  const [validation, setValidation] = useState<FlowValidationResult | null>(null)

  const plan = summary?.plan ?? null
  const canEditPlan = Boolean(plan)
  const hasDraftId = Boolean(draftFlowId ?? compiledFlow?.id ?? plan?.automation_id)
  const canPersistEdits = Boolean(onSaveDraft && canEditPlan)

  const { trigger, actions } = useMemo(() => {
    if (compiledFlow) {
      return {
        trigger: compiledFlow.trigger as AutomationTrigger,
        actions: [...compiledFlow.actions] as AutomationAction[],
      }
    }
    if (!plan) {
      return {
        trigger: { type: 'choose_action' } as AutomationTrigger,
        actions: [] as AutomationAction[],
      }
    }
    return flowBuildPlanToAutomationRule(plan)
  }, [compiledFlow, plan])

  const friendlyValidationErrors = useMemo(
    () => (plan?.validation_errors ?? []).map((error) => formatFlowValidationError(error)),
    [plan?.validation_errors],
  )

  const handleValidateDraft = async (data: FlowAutomationPayload) => {
    if (!onValidateDraft) return
    setBusy('validate')
    try {
      const result = await onValidateDraft(data)
      setValidation(result)
      if (result.valid) toast.success('Validation passed')
      else toast.error('Validation failed')
    } finally {
      setBusy(null)
    }
  }

  const handleManualSaveComplete = () => {
    toast.success(hasDraftId ? 'Flow draft saved' : 'Flow draft created')
  }

  if (!summary) {
    if (loading) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <VibeyLoadingOrb text="Loading flow..." state="processing" size="md" />
        </div>
      )
    }
    return null
  }

  if (!plan) {
    const sessionLabel =
      optionalString(summary.session?.plan_name)?.trim() ||
      optionalString(summary.session?.intent)?.trim() ||
      'Building your flow'
    const statusLabel = summary.session?.status?.replace(/_/g, ' ') ?? 'in progress'
    return (
      <div className="gap-spacing-3 p-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center">
        <VibeyLoadingOrb text="Loop is building your flow..." state="processing" size="md" />
        <div className="text-center">
          <p className="body-2 text-foreground font-medium">{sessionLabel}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1 capitalize">{statusLabel}</p>
        </div>
      </div>
    )
  }

  const flowName = compiledFlow?.name ?? plan.name
  const statusCopy = hasDraftId
    ? 'Steps autosave to your draft. Loop compile is optional — save works without chat.'
    : 'Configure steps, then Save draft — no need to wait for Loop to compile.'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border px-spacing-4 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between border-b">
        <p className="body-4 text-muted-foreground min-w-0 flex-1">{statusCopy}</p>
        <div className="gap-spacing-2 flex shrink-0 items-center">
          {canPersistEdits ? <SaveIndicator status={autosaveStatus} /> : null}
          {canPersistEdits ? (
            <button
              type="button"
              className="button-compact button-glass-neutral gap-spacing-2"
              disabled={busy === 'save'}
              onClick={() => setSaveRequestId((current) => current + 1)}
            >
              <Save className="icon-xs" />
              Save draft
            </button>
          ) : null}
          {onValidateDraft ? (
            <button
              type="button"
              className="button-compact button-glass gap-spacing-2"
              disabled={busy === 'validate'}
              onClick={() => setValidateRequestId((current) => current + 1)}
            >
              <CheckCircle2 className="icon-xs" />
              Validate
            </button>
          ) : null}
        </div>
      </div>
      <ValidationBanner
        errors={friendlyValidationErrors}
        plan={plan}
        summary={summary}
        onAskLoopToFix={onAskLoopToFix}
      />
      {validation && !validation.valid ? (
        <div className="border-destructive bg-destructive/10 px-spacing-4 py-spacing-3 gap-spacing-2 flex shrink-0 items-start border-b">
          <XCircle className="icon-sm text-destructive mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="body-3 text-foreground font-medium">{FLOW_VALIDATION_UI.BANNER_INVALID}</p>
            <ul className="body-4 text-muted-foreground mt-spacing-1 space-y-spacing-1">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <FlowBuilderStudio
        flowName={flowName}
        plan={plan}
        trigger={trigger}
        actions={actions}
        fields={fields}
        roster={roster}
        campaignId={campaignId}
        spaceId={spaceId}
        triggerContextSpaces={[]}
        flowSpaceIsConceptSandbox={false}
        contactsTriggerPickers={contactsTriggerPickers}
        editable={canEditPlan}
        onSaveDraft={
          canPersistEdits && onSaveDraft
            ? async (data) => {
                await onSaveDraft(data)
              }
            : undefined
        }
        onAutosaveStatusChange={canPersistEdits ? setAutosaveStatus : undefined}
        saveRequestId={saveRequestId}
        onManualSaveComplete={canPersistEdits ? handleManualSaveComplete : undefined}
        onValidateRequest={onValidateDraft ? handleValidateDraft : undefined}
        validateRequestId={validateRequestId}
      />
    </div>
  )
}

function ValidationBanner({
  errors,
  plan,
  summary,
  onAskLoopToFix,
}: {
  errors: ReturnType<typeof formatFlowValidationError>[]
  plan: NonNullable<FlowBuildSessionSummary['plan']>
  summary: FlowBuildSessionSummary
  onAskLoopToFix?: (prompt: string) => void
}) {
  if (plan.validation_errors.length === 0) return null
  return (
    <div className="border-destructive bg-destructive/10 px-spacing-4 py-spacing-3 gap-spacing-3 flex shrink-0 items-start border-b">
      <XCircle className="icon-sm text-destructive mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="body-3 text-foreground font-medium">{FLOW_VALIDATION_UI.BANNER_INVALID}</p>
        <ul className="list-card-compact body-4 text-muted-foreground mt-spacing-1">
          {errors.map((error) => (
            <li key={error.technicalMessage}>{error.userMessage}</li>
          ))}
        </ul>
      </div>
      {onAskLoopToFix ? (
        <button
          type="button"
          className="button-compact button-glass-neutral shrink-0"
          onClick={() =>
            onAskLoopToFix(
              buildFlowValidationLoopPrompt({
                flowName: plan.name,
                flowId: plan.automation_id ?? String(summary.session.id ?? 'build'),
                errors: plan.validation_errors,
              }),
            )
          }
        >
          {FLOW_VALIDATION_UI.ASK_LOOP}
        </button>
      ) : null}
    </div>
  )
}
