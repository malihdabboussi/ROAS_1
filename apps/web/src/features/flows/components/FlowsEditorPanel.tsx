'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type { SpaceFieldDef } from '@/lib/spaces/spaces-api'
import type { FlowTriggerContextSpace } from '@/lib/flows/flow-trigger-context-space.utils'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  SaveIndicator,
  type SaveIndicatorStatus,
} from '@/components/ui/feedback/SaveIndicator'
import { isFlowDraftPlaceholder } from '@/lib/flows/automation-publishable'
import type { FlowAutomation, FlowAutomationPayload } from '../types/flow-automation.types'
import type { FlowValidationResult } from '../services/flows.service'
import {
  FLOW_VALIDATION_UI,
  formatFlowValidationError,
  buildFlowValidationLoopPrompt,
} from '../config/errors.config'
import { FlowCardEnableToggle } from './FlowCardEnableToggle'
import { FlowBuilderStudio } from './flow-builder/FlowBuilderStudio'
import type {
  AutomationAction,
  AutomationTrigger,
} from '@/features/spaces/types/space-schema'

interface FlowsEditorPanelProps {
  spaceId: string
  flow: FlowAutomation
  campaignId: string | null
  fields: SpaceFieldDef[]
  triggerContextSpaces: FlowTriggerContextSpace[]
  flowSpaceIsConceptSandbox: boolean
  roster: TeamRosterEntry[]
  contactsTriggerPickers: ContactsTriggerPickers
  validation: FlowValidationResult | null
  canPublish: boolean
  busy: string | null
  onBack?: () => void
  onSave: (data: FlowAutomationPayload) => Promise<void>
  onValidate: (data: FlowAutomationPayload) => Promise<void>
  onPublish: () => void
  onToggleEnabled: (flow: FlowAutomation, enabled: boolean) => void | Promise<void>
  onAskLoopToFix?: (prompt: string) => void
}

export function FlowsEditorPanel({
  spaceId,
  flow,
  campaignId,
  fields,
  triggerContextSpaces,
  flowSpaceIsConceptSandbox,
  roster,
  contactsTriggerPickers,
  validation,
  canPublish,
  busy,
  onBack,
  onSave,
  onValidate,
  onPublish,
  onToggleEnabled,
  onAskLoopToFix,
}: FlowsEditorPanelProps) {
  const [autosaveStatus, setAutosaveStatus] = useState<SaveIndicatorStatus>('idle')
  const isPublished = !flow.is_draft
  const isSavingPrimary = busy === 'publish'
  const isPlaceholderDraft = useMemo(
    () => isFlowDraftPlaceholder(flow.trigger, flow.actions),
    [flow.trigger, flow.actions],
  )

  const friendlyErrors = useMemo(
    () => (validation?.errors ?? []).map((error) => formatFlowValidationError(error)),
    [validation?.errors],
  )

  const validationTooltip = useMemo(() => {
    if (!friendlyErrors.length) return FLOW_VALIDATION_UI.BANNER_INVALID
    return friendlyErrors.map((error) => error.userMessage).join(' · ')
  }, [friendlyErrors])

  const handleAskLoopToFix = () => {
    if (!validation || validation.valid || validation.errors.length === 0) return
    const prompt = buildFlowValidationLoopPrompt({
      flowName: flow.name,
      flowId: flow.id,
      errors: validation.errors,
    })
    onAskLoopToFix?.(prompt)
  }

  const handleValidateLatest = () => {
    void onValidate({
      name: flow.name,
      trigger: flow.trigger as AutomationTrigger,
      actions: flow.actions as AutomationAction[],
    })
  }
  const handleToggleEditorFlow = (
    _flow: Parameters<typeof FlowCardEnableToggle>[0]['flow'],
    enabled: boolean,
  ) =>
    onToggleEnabled(flow, enabled)

  const primaryActionLabel = isPublished ? FLOWS_UI.saveAndUpdate : 'Publish'
  const primaryActionBusyLabel = isPublished ? FLOWS_UI.savingUpdate : 'Publishing…'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border px-spacing-4 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between border-b">
        <div className="gap-spacing-3 flex min-w-0 flex-1 items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="btn-icon-bare text-muted-foreground hover:text-foreground shrink-0"
              aria-label={`Back to ${FLOWS_UI.myLoopsLabel}`}
            >
              <ArrowLeft className="icon-sm" />
            </button>
          ) : null}
        </div>
        <div className="gap-spacing-2 flex min-w-0 shrink-0 items-center">
          <SaveIndicator status={autosaveStatus} />
          <FlowCardEnableToggle
            flow={flow as unknown as Parameters<typeof FlowCardEnableToggle>[0]['flow']}
            onToggleEnabled={handleToggleEditorFlow}
          />
          <Tooltip
            label={FLOW_VALIDATION_UI.VALIDATE_TOOLTIP}
            side="bottom"
            wide
            triggerClassName="inline-flex"
          >
            <button
              type="button"
              onClick={handleValidateLatest}
              disabled={busy === 'validate'}
              className="button-default button-glass"
            >
              <CheckCircle2 className="icon-xs" />
              Validate
            </button>
          </Tooltip>
          {validation && !isPlaceholderDraft && !validation.valid ? (
            <>
              <Tooltip
                wide
                side="bottom"
                triggerClassName="inline-flex min-w-0 max-w-56"
                label={validationTooltip}
              >
                <span className="gap-spacing-2 border-destructive/30 bg-destructive/10 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex min-w-0 max-w-full items-center border">
                  <CircleAlert className="icon-xs text-destructive shrink-0" />
                  <span className="body-3 text-foreground min-w-0 truncate font-medium">
                    {friendlyErrors[0]?.userMessage ?? FLOW_VALIDATION_UI.BANNER_INVALID}
                  </span>
                </span>
              </Tooltip>
              {validation.errors.length > 0 && onAskLoopToFix ? (
                <button
                  type="button"
                  onClick={handleAskLoopToFix}
                  className="button-default button-glass-neutral shrink-0"
                >
                  {FLOW_VALIDATION_UI.ASK_LOOP}
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish || isSavingPrimary}
            aria-busy={isSavingPrimary}
            className="button-default button-glass-primary gap-spacing-2 shrink-0"
          >
            {isSavingPrimary ? (
              <>
                <Loader2 className="icon-xs animate-spin" aria-hidden />
                {primaryActionBusyLabel}
              </>
            ) : (
              primaryActionLabel
            )}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FlowBuilderStudio
          key={flow.id}
          flowName={flow.name}
          trigger={flow.trigger as AutomationTrigger}
          actions={[...(flow.actions as AutomationAction[])]}
          fields={fields}
          roster={roster}
          campaignId={campaignId}
          spaceId={spaceId}
          triggerContextSpaces={triggerContextSpaces}
          flowSpaceIsConceptSandbox={flowSpaceIsConceptSandbox}
          contactsTriggerPickers={contactsTriggerPickers}
          editable
          onSaveDraft={onSave}
          onAutosaveStatusChange={setAutosaveStatus}
        />
      </div>
    </div>
  )
}
