'use client'

import { Building2, CheckCircle2, CircleAlert, CircleHelp } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type {
  FlowAutomationSummary,
  FlowInstallationSummary as FlowInstallation,
  FlowInstallationValidationStatus,
} from '../types/flow-automation.types'

function fallbackInstallation(flow: FlowAutomationSummary): FlowInstallation {
  return {
    id: flow.automation_id ?? flow.id,
    automation_id: flow.automation_id ?? flow.id,
    flow_definition_id: flow.flow_definition_id ?? null,
    flow_installation_id: flow.flow_installation_id ?? null,
    flow_version_id: flow.flow_version_id ?? null,
    name: flow.name,
    description: flow.description ?? null,
    enabled: flow.enabled,
    is_draft: flow.is_draft,
    trigger: flow.trigger,
    actions: flow.actions,
    created_at: flow.created_at,
    updated_at: flow.updated_at,
    space_id: flow.space_id,
    space_title: flow.space_title,
    campaign_id: flow.campaign_id,
    campaign_name: flow.campaign_name,
    validation_status: 'unknown',
    validation_errors: [],
  }
}

export function getFlowInstallations(flow: FlowAutomationSummary): readonly FlowInstallation[] {
  return flow.installations?.length ? flow.installations : [fallbackInstallation(flow)]
}

export function getFlowInstallationCount(flow: FlowAutomationSummary): number {
  return flow.installation_count ?? getFlowInstallations(flow).length
}

function countByStatus(
  installations: readonly FlowInstallation[],
  statuses: FlowInstallationValidationStatus[],
) {
  return installations.filter((installation) =>
    statuses.includes(installation.validation_status ?? 'unknown'),
  ).length
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function StatusIcon({ status }: { status: FlowInstallationValidationStatus }) {
  if (status === 'healthy') return <CheckCircle2 className="icon-xs text-success" />
  if (status === 'needs_setup' || status === 'invalid') {
    return <CircleAlert className="icon-xs text-destructive" />
  }
  return <CircleHelp className="icon-xs text-muted-foreground" />
}

export function FlowInstallationMeta({ flow }: { flow: FlowAutomationSummary }) {
  const installations = getFlowInstallations(flow)
  const installCount = getFlowInstallationCount(flow)
  const healthyCount = flow.healthy_installation_count ?? countByStatus(installations, ['healthy'])
  const needsSetupCount =
    flow.needs_setup_installation_count ?? countByStatus(installations, ['needs_setup', 'invalid'])
  const unknownCount = flow.unknown_installation_count ?? countByStatus(installations, ['unknown'])

  return (
    <div className="gap-spacing-1 text-muted-foreground flex shrink-0 items-center">
      <Tooltip label={countLabel(installCount, 'Space')} side="top">
        <span className="gap-spacing-1 inline-flex items-center">
          <Building2 className="icon-xs" />
          <span className="typo-caption tabular-nums">{installCount}</span>
        </span>
      </Tooltip>
      {needsSetupCount > 0 ? (
        <Tooltip
          label={countLabel(needsSetupCount, 'install needs setup', 'installs need setup')}
          side="top"
        >
          <span className="gap-spacing-1 inline-flex items-center">
            <CircleAlert className="icon-xs text-destructive" />
            <span className="typo-caption tabular-nums">{needsSetupCount}</span>
          </span>
        </Tooltip>
      ) : healthyCount > 0 && unknownCount === 0 ? (
        <Tooltip label="All installs are healthy" side="top">
          <span className="inline-flex items-center">
            <CheckCircle2 className="icon-xs text-success" />
          </span>
        </Tooltip>
      ) : unknownCount > 0 ? (
        <Tooltip
          label={countLabel(unknownCount, 'install not checked', 'installs not checked')}
          side="top"
        >
          <span className="gap-spacing-1 inline-flex items-center">
            <CircleHelp className="icon-xs" />
            <span className="typo-caption tabular-nums">{unknownCount}</span>
          </span>
        </Tooltip>
      ) : null}
    </div>
  )
}

export function FlowInstallationRows({
  flow,
  onOpenInstallation,
}: {
  flow: FlowAutomationSummary
  onOpenInstallation: (installation: FlowInstallation) => void
}) {
  const installations = getFlowInstallations(flow)
  if (installations.length <= 1) return null

  return (
    <div className="border-border mt-spacing-2 gap-spacing-1 pt-spacing-2 flex flex-col border-t">
      {installations.map((installation) => (
        <button
          key={installation.flow_installation_id ?? installation.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpenInstallation(installation)
          }}
          className="hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors"
        >
          <StatusIcon status={installation.validation_status ?? 'unknown'} />
          <span className="body-3 text-foreground min-w-0 flex-1 truncate">
            {installation.space_title ?? 'Untitled space'}
          </span>
          <span className="typo-caption text-muted-foreground">
            {installation.enabled ? 'On' : 'Off'}
          </span>
        </button>
      ))}
    </div>
  )
}
