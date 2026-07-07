import type { AutomationTrigger } from '@/features/spaces/types/space-schema'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import {
  CONNECTED_APP_FLOW_PROVIDERS,
  getConnectedAppFlowProviderLabel,
  listConnectedAppFlowTriggersByProvider,
  type ConnectedAppFlowProvider,
} from '@/lib/flows/connected-app-flow-triggers'

export type FlowConnectedAppKey =
  | 'fathom'
  | 'slack'
  | 'gmail'
  | 'outlook'
  | ConnectedAppFlowProvider

const PROVIDER_TO_INTEGRATION_ID: Record<ConnectedAppFlowProvider, string> = {
  googlecalendar: 'google_calendar',
  googledrive: 'google_drive',
  googlesheets: 'google_sheets',
  salesforce: 'salesforce',
  github: 'github',
  notion: 'notion',
}

export type FlowConnectedAppDef = {
  key: FlowConnectedAppKey
  label: string
  integrationId: string
}

export const FLOW_CONNECTED_APP_DEFS: FlowConnectedAppDef[] = [
  { key: 'fathom', label: 'Fathom', integrationId: 'fathom' },
  { key: 'slack', label: 'Slack', integrationId: 'slack' },
  { key: 'gmail', label: 'Gmail', integrationId: 'gmail' },
  { key: 'outlook', label: 'Outlook', integrationId: 'outlook' },
  ...CONNECTED_APP_FLOW_PROVIDERS.map((provider) => ({
    key: provider,
    label: getConnectedAppFlowProviderLabel(provider),
    integrationId: PROVIDER_TO_INTEGRATION_ID[provider],
  })),
]

export function isFlowConnectedAppTrigger(trigger: AutomationTrigger): boolean {
  return (
    trigger.type === 'external_fathom_recording_ready' ||
    trigger.type === 'external_slack_message_received' ||
    trigger.type === 'external_email_received' ||
    trigger.type === 'external_app_event'
  )
}

export function resolveFlowConnectedAppKey(trigger: AutomationTrigger): FlowConnectedAppKey | null {
  switch (trigger.type) {
    case 'external_fathom_recording_ready':
      return 'fathom'
    case 'external_slack_message_received':
      return 'slack'
    case 'external_email_received':
      return trigger.provider === 'outlook' ? 'outlook' : 'gmail'
    case 'external_app_event':
      return (trigger.provider as FlowConnectedAppKey | undefined) ?? null
    default:
      return null
  }
}

export function getTriggerIntegrationLogoSrc(trigger: AutomationTrigger): string | null {
  const appKey = resolveFlowConnectedAppKey(trigger)
  if (!appKey) return null
  const def = FLOW_CONNECTED_APP_DEFS.find((row) => row.key === appKey)
  return def ? getIntegrationLogoPath(def.integrationId) : null
}

export function flowConnectedAppEventOptions(
  appKey: FlowConnectedAppKey,
): Array<{ value: string; label: string }> {
  switch (appKey) {
    case 'fathom':
      return [{ value: 'external_fathom_recording_ready', label: 'Recording ready' }]
    case 'slack':
      return [{ value: 'external_slack_message_received', label: 'Message received' }]
    case 'gmail':
      return [{ value: 'gmail:external_email_received', label: 'Email received' }]
    case 'outlook':
      return [{ value: 'outlook:external_email_received', label: 'Email received' }]
    default:
      return listConnectedAppFlowTriggersByProvider(appKey).map((entry) => ({
        value: entry.triggerSlug,
        label: entry.eventLabel,
      }))
  }
}

export function resolveFlowConnectedAppEventValue(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'external_fathom_recording_ready':
      return 'external_fathom_recording_ready'
    case 'external_slack_message_received':
      return 'external_slack_message_received'
    case 'external_email_received':
      return trigger.provider === 'outlook'
        ? 'outlook:external_email_received'
        : 'gmail:external_email_received'
    case 'external_app_event':
      return trigger.trigger_slug ?? ''
    default:
      return ''
  }
}

export function resolveFlowConnectedAppDisplay(trigger: AutomationTrigger): {
  appKey: FlowConnectedAppKey
  appLabel: string
  eventLabel: string | null
  logoSrc: string | null
} | null {
  const appKey = resolveFlowConnectedAppKey(trigger)
  if (!appKey) return null
  const def = FLOW_CONNECTED_APP_DEFS.find((row) => row.key === appKey)
  const eventValue = resolveFlowConnectedAppEventValue(trigger)
  const eventOption = flowConnectedAppEventOptions(appKey).find((row) => row.value === eventValue)
  return {
    appKey,
    appLabel: def?.label ?? appKey,
    eventLabel: eventOption?.label ?? null,
    logoSrc: getTriggerIntegrationLogoSrc(trigger),
  }
}

export function resolveComposioToolkitForFlowConnectedApp(appKey: FlowConnectedAppKey): string {
  switch (appKey) {
    case 'slack':
      return 'slack'
    case 'gmail':
      return 'gmail'
    case 'outlook':
      return 'outlook'
    default:
      return appKey
  }
}

export function buildFlowConnectedAppTrigger(
  appKey: FlowConnectedAppKey,
  eventValue?: string,
): AutomationTrigger {
  const events = flowConnectedAppEventOptions(appKey)
  const resolvedEvent = eventValue && events.some((row) => row.value === eventValue)
    ? eventValue
    : events[0]?.value

  switch (appKey) {
    case 'fathom':
      return { type: 'external_fathom_recording_ready' }
    case 'slack':
      return {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
        connected_account_id: '',
      }
    case 'gmail':
      return {
        type: 'external_email_received',
        provider: 'gmail',
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        connected_account_id: '',
      }
    case 'outlook':
      return {
        type: 'external_email_received',
        provider: 'outlook',
        trigger_slug: 'OUTLOOK_MESSAGE_TRIGGER',
        connected_account_id: '',
      }
    default: {
      const slug =
        resolvedEvent && !resolvedEvent.includes(':')
          ? resolvedEvent
          : listConnectedAppFlowTriggersByProvider(appKey)[0]?.triggerSlug ?? ''
      return {
        type: 'external_app_event',
        provider: appKey,
        trigger_slug: slug,
        connected_account_id: '',
      }
    }
  }
}

export function applyFlowConnectedAppEvent(
  trigger: AutomationTrigger,
  appKey: FlowConnectedAppKey,
  eventValue: string,
): AutomationTrigger {
  const preserveAccount =
    trigger.type === 'external_email_received' ||
    trigger.type === 'external_slack_message_received' ||
    trigger.type === 'external_app_event'
      ? trigger.connected_account_id ?? ''
      : ''

  if (eventValue === 'external_fathom_recording_ready') {
    return { type: 'external_fathom_recording_ready' }
  }
  if (eventValue === 'external_slack_message_received') {
    return {
      type: 'external_slack_message_received',
      trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
      connected_account_id: preserveAccount,
    }
  }
  if (eventValue === 'gmail:external_email_received') {
    return {
      type: 'external_email_received',
      provider: 'gmail',
      trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
      connected_account_id: preserveAccount,
    }
  }
  if (eventValue === 'outlook:external_email_received') {
    return {
      type: 'external_email_received',
      provider: 'outlook',
      trigger_slug: 'OUTLOOK_MESSAGE_TRIGGER',
      connected_account_id: preserveAccount,
    }
  }

  return {
    type: 'external_app_event',
    provider: appKey as ConnectedAppFlowProvider,
    trigger_slug: eventValue,
    connected_account_id: preserveAccount,
    trigger_config: trigger.type === 'external_app_event' ? trigger.trigger_config : undefined,
  }
}
