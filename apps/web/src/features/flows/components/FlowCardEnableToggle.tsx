'use client'

import { toast } from 'sonner'
import { Switch } from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type { FlowAutomationSummary } from '../types/flow-automation.types'

export function FlowCardEnableToggle({
  flow,
  onToggleEnabled,
}: {
  flow: FlowAutomationSummary
  onToggleEnabled: (flow: FlowAutomationSummary, enabled: boolean) => void | Promise<void>
}) {
  const handleDraftToggle = (enabled: boolean) => {
    if (!enabled) return
    toast.error(FLOWS_UI.draftEnableBlocked)
  }

  const switchControl = flow.is_draft ? (
    <Switch
      checked={false}
      aria-label={`${flow.name} is off until published`}
      onCheckedChange={handleDraftToggle}
    />
  ) : (
    <Switch
      checked={flow.enabled}
      aria-label={flow.enabled ? `Turn off ${flow.name}` : `Turn on ${flow.name}`}
      onCheckedChange={(enabled) => void onToggleEnabled(flow, enabled)}
    />
  )

  return (
    <div
      className="shrink-0"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {flow.is_draft ? (
        <Tooltip
          label={FLOWS_UI.draftEnableTooltip}
          side="top"
          wide
          triggerClassName="inline-flex"
        >
          {switchControl}
        </Tooltip>
      ) : (
        switchControl
      )}
    </div>
  )
}
