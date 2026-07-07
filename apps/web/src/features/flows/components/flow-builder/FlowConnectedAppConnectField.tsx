'use client'

import { useCallback, useState } from 'react'
import { Loader2, PlugZap } from 'lucide-react'
import { AutomationLazySelect } from '@/features/spaces/components/automations/AutomationLazySelect'
import { searchAutomationComposioAccounts } from '@/features/spaces/services/automations.service'
import type { AutomationTrigger } from '@/features/spaces/types/space-schema'
import { useUserRole } from '@/hooks/use-user-role'
import {
  FLOW_CONNECTED_APP_DEFS,
  resolveComposioToolkitForFlowConnectedApp,
  type FlowConnectedAppKey,
} from '@/lib/flows/flow-builder-connected-app-trigger.utils'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { getAvailableIntegrations } from '@/lib/integrations/integration-catalog'
import { useIntegrationOverview } from '@/lib/integrations/use-integration-overview'
import { cn } from '@/lib/utils/cn'
import { useFlowBuilderConnectedIntegrations } from '../../hooks/use-flow-builder-connected-integrations'

type ComposioAccountTrigger = Extract<
  AutomationTrigger,
  { type: 'external_slack_message_received' | 'external_email_received' | 'external_app_event' }
>

function triggerUsesComposioAccount(trigger: AutomationTrigger): trigger is ComposioAccountTrigger {
  return (
    trigger.type === 'external_slack_message_received' ||
    trigger.type === 'external_email_received' ||
    trigger.type === 'external_app_event'
  )
}

function IntegrationLogo({ integrationId, name }: { integrationId: string; name: string }) {
  const logoPath = getIntegrationLogoPath(integrationId)
  return (
    <span className="h-spacing-10 w-spacing-10 inline-flex shrink-0 items-center justify-center">
      {logoPath ? (
        <img
          src={logoPath}
          alt={`${name} logo`}
          className="h-spacing-7 w-spacing-7 block object-contain object-center"
        />
      ) : (
        <span className="typo-caption text-muted-foreground font-medium">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  )
}

export function FlowConnectedAppConnectField({
  appKey,
  trigger,
  eventLabel,
  editable,
  onChangeTrigger,
}: {
  appKey: FlowConnectedAppKey
  trigger: AutomationTrigger
  eventLabel?: string | null
  editable: boolean
  onChangeTrigger: (next: AutomationTrigger) => void
}) {
  const { isSuperadmin } = useUserRole()
  const {
    connectedIntegrationIds,
    loading: connectedLoading,
    reload: reloadConnected,
  } = useFlowBuilderConnectedIntegrations()
  const { connectIntegration } = useIntegrationOverview()
  const [connecting, setConnecting] = useState(false)

  const def = FLOW_CONNECTED_APP_DEFS.find((row) => row.key === appKey)
  const integrationId = def?.integrationId ?? appKey
  const appLabel = def?.label ?? appKey
  const isIntegrationConnected = connectedIntegrationIds.has(integrationId)
  const toolkit = resolveComposioToolkitForFlowConnectedApp(appKey)
  const showAccountPicker = isIntegrationConnected && triggerUsesComposioAccount(trigger)
  const composioTrigger = showAccountPicker ? trigger : null

  const handleConnect = useCallback(async () => {
    if (!editable) return
    setConnecting(true)
    try {
      const integration = getAvailableIntegrations(isSuperadmin).find(
        (row) => row.id === integrationId,
      )
      if (!integration) return
      await connectIntegration(integration)
      await reloadConnected()
    } finally {
      setConnecting(false)
    }
  }, [connectIntegration, editable, integrationId, isSuperadmin, reloadConnected])

  const subtitle =
    eventLabel?.trim() ||
    (isIntegrationConnected
      ? 'Choose which connected account should power this trigger.'
      : 'Connect this app to finish setting up the trigger.')

  return (
    <div className="section-card gap-spacing-3 p-spacing-3 flex flex-col">
      <div className="gap-spacing-3 flex items-start">
        <IntegrationLogo integrationId={integrationId} name={appLabel} />
        <div className="min-w-0 flex-1">
          <p className="typo-caption text-muted-foreground font-semibold uppercase tracking-wide">
            Integration
          </p>
          <p className="body-3 text-foreground mt-spacing-1 font-semibold">{appLabel}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">{subtitle}</p>
        </div>
        {connectedLoading ? (
          <Loader2 className="icon-sm text-muted-foreground shrink-0 animate-spin" />
        ) : isIntegrationConnected ? (
          <span className="badge-glass badge-glass-sm badge-glass-green shrink-0">Connected</span>
        ) : (
          <span className="badge-glass badge-glass-sm badge-glass-muted shrink-0">Not connected</span>
        )}
      </div>

      {connectedLoading ? (
        <div className="body-3 text-muted-foreground gap-spacing-2 flex items-center">
          <Loader2 className="icon-xs animate-spin shrink-0" />
          Checking connection…
        </div>
      ) : !isIntegrationConnected ? (
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={!editable || connecting}
          className={cn(
            'button-default button-glass gap-spacing-2 w-full justify-center',
            !editable && 'cursor-not-allowed opacity-60',
          )}
        >
          {connecting ? (
            <Loader2 className="icon-xs animate-spin" />
          ) : (
            <PlugZap className="icon-xs" />
          )}
          Connect {appLabel}
        </button>
      ) : composioTrigger ? (
        <div>
          <p className="body-4 text-foreground mb-spacing-2 font-medium">Connected account</p>
          <AutomationLazySelect
            value={composioTrigger.connected_account_id ?? ''}
            onChange={(connected_account_id) =>
              onChangeTrigger({ ...composioTrigger, connected_account_id })
            }
            placeholder={`Select ${appLabel} account`}
            searchPlaceholder={`Search ${appLabel} accounts…`}
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationComposioAccounts({
                toolkit,
                search,
                offset,
                limit,
              })
              return {
                options: result.options.map((account) => ({
                  value: account.id,
                  label: account.label,
                  description: account.description,
                })),
                hasMore: result.hasMore,
              }
            }}
            allowClear={false}
            disabled={!editable}
          />
        </div>
      ) : appKey === 'fathom' ? (
        <p className="body-4 text-muted-foreground">
          Fathom is connected. Choose the listen source in Configure.
        </p>
      ) : null}
    </div>
  )
}
