import type { AutomationAction, AutomationTrigger } from '@/features/spaces/types/space-schema'
import type { FlowBuilderStepCategoryId } from '@/lib/flows/flow-builder-step-types.utils'
import {
  defaultAction,
  defaultObjectForTriggerType,
  defaultTriggerForType,
  triggerSectionsForObject,
  type TriggerObjectKey,
} from '@/features/spaces/components/automations/automation-catalog'
import {
  listConnectedAppFlowTriggersByProvider,
  type ConnectedAppFlowProvider,
} from '@/lib/flows/connected-app-flow-triggers'
import { getAvailableIntegrations } from '@/lib/integrations/integration-catalog'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'

export type FlowBuilderPickerSelection =
  | { kind: 'category'; categoryId: FlowBuilderStepCategoryId }
  | { kind: 'trigger'; trigger: AutomationTrigger }
  | { kind: 'action'; action: AutomationAction }

export type FlowBuilderPickerEvent = {
  id: string
  label: string
  description?: string
  selection: FlowBuilderPickerSelection
  disabled?: boolean
}

export type FlowBuilderPickerApp = {
  id: string
  label: string
  description?: string
  logoSrc: string | null
  connected: boolean
  events: FlowBuilderPickerEvent[]
}

export type FlowBuilderPickerBuiltIn = {
  id: FlowBuilderStepCategoryId
  label: string
  description: string
  badgeVariant: string
}

const INTEGRATION_ID_TO_CONNECTED_PROVIDER: Partial<Record<string, ConnectedAppFlowProvider>> = {
  google_calendar: 'googlecalendar',
  google_drive: 'googledrive',
  google_sheets: 'googlesheets',
  salesforce: 'salesforce',
  github: 'github',
  notion: 'notion',
}

export const FLOW_BUILDER_HOME_POPULAR_INTEGRATIONS = [
  'fathom',
  'slack',
  'gmail',
  'google_calendar',
  'google_sheets',
  'notion',
] as const

function triggerSelection(triggerType: string, object?: TriggerObjectKey): FlowBuilderPickerSelection {
  const resolvedObject = object ?? defaultObjectForTriggerType(triggerType)
  return {
    kind: 'trigger',
    trigger: defaultTriggerForType(triggerType, resolvedObject),
  }
}

const SPACE_TRIGGER_OBJECTS: TriggerObjectKey[] = [
  'tasks',
  'subtasks',
  'all_tasks',
  'forms',
  'contacts',
  'artifacts',
  'webhooks',
  'schedule',
]

/** Space, form, contact, schedule, and webhook triggers for the trigger picker. */
export function buildFlowBuilderSpaceTriggerEvents(): FlowBuilderPickerEvent[] {
  const events: FlowBuilderPickerEvent[] = []
  const seen = new Set<string>()

  for (const object of SPACE_TRIGGER_OBJECTS) {
    for (const section of triggerSectionsForObject(object)) {
      for (const option of section.options) {
        if (seen.has(option.value)) continue
        seen.add(option.value)
        events.push({
          id: `space-trigger-${option.value}`,
          label: option.label,
          description: section.heading,
          selection: triggerSelection(option.value, object),
        })
      }
    }
  }

  return events
}

export function filterPickerAppsTriggersOnly(apps: FlowBuilderPickerApp[]): FlowBuilderPickerApp[] {
  return apps
    .map((app) => ({
      ...app,
      events: app.events.filter((event) => event.selection.kind === 'trigger'),
    }))
    .filter((app) => app.events.length > 0)
}

function actionSelection(actionType: string): FlowBuilderPickerSelection | null {
  const action = defaultAction(actionType)
  if (!action) return null
  return { kind: 'action', action }
}

function connectedAppTriggerEvents(provider: ConnectedAppFlowProvider): FlowBuilderPickerEvent[] {
  return listConnectedAppFlowTriggersByProvider(provider).map((row) => ({
    id: `trigger-${row.triggerSlug}`,
    label: row.eventLabel,
    description: row.providerLabel,
    selection: triggerSelection(row.triggerSlug),
  }))
}

function integrationFallbackEvent(integrationId: string, label: string): FlowBuilderPickerEvent {
  return {
    id: `integration-${integrationId}-step`,
    label: `Use ${label}`,
    description: 'Add this integration to your flow and configure the step',
    selection: { kind: 'category', categoryId: 'integration' },
  }
}

function buildIntegrationEvents(integrationId: string, allowTriggers: boolean): FlowBuilderPickerEvent[] {
  const events: FlowBuilderPickerEvent[] = []

  if (allowTriggers) {
    switch (integrationId) {
      case 'fathom':
        events.push({
          id: 'trigger-fathom',
          label: 'Recording ready',
          description: 'When a Fathom meeting transcript is ready',
          selection: triggerSelection('external_fathom_recording_ready'),
        })
        break
      case 'slack':
        events.push({
          id: 'trigger-slack',
          label: 'Message received',
          description: 'When a Slack direct message arrives',
          selection: triggerSelection('external_slack_message_received'),
        })
        break
      case 'gmail':
        events.push({
          id: 'trigger-gmail',
          label: 'Email received',
          description: 'When a new email arrives in Gmail',
          selection: triggerSelection('external_email_received'),
        })
        break
      case 'outlook':
        events.push({
          id: 'trigger-outlook',
          label: 'Email received',
          description: 'When a new email arrives in Outlook',
          selection: {
            kind: 'trigger',
            trigger: {
              type: 'external_email_received',
              provider: 'outlook',
              trigger_slug: 'OUTLOOK_MESSAGE_TRIGGER',
              connected_account_id: '',
            },
          },
        })
        break
      default: {
        const provider = INTEGRATION_ID_TO_CONNECTED_PROVIDER[integrationId]
        if (provider) events.push(...connectedAppTriggerEvents(provider))
      }
    }
  }

  switch (integrationId) {
    case 'slack': {
      const selection = actionSelection('send_slack_message')
      if (selection) {
        events.push({
          id: 'action-slack-send',
          label: 'Send Slack message',
          description: 'Post a message to a Slack channel',
          selection,
        })
      }
      break
    }
    case 'gmail':
    case 'outlook': {
      const selection = actionSelection('send_email')
      if (selection) {
        events.push({
          id: `action-${integrationId}-send`,
          label: 'Send email',
          description:
            integrationId === 'outlook' ? 'Send an email via Outlook' : 'Send an email via Gmail',
          selection,
        })
      }
      break
    }
    case 'github': {
      const selection = actionSelection('send_to_cursor')
      if (selection) {
        events.push({
          id: 'action-github-cursor',
          label: 'Send to Cursor',
          description: 'Open a PR from a GitHub-connected repo',
          selection,
        })
      }
      break
    }
    default:
      break
  }

  return events
}

export function buildFlowBuilderIntegrationApp(
  integrationId: string,
  label: string,
  allowTriggers: boolean,
  connected: boolean,
  description?: string,
): FlowBuilderPickerApp {
  const events = buildIntegrationEvents(integrationId, allowTriggers)
  const resolvedEvents =
    events.length > 0 ? events : [integrationFallbackEvent(integrationId, label)]

  return {
    id: integrationId,
    label,
    description,
    logoSrc: getIntegrationLogoPath(integrationId),
    connected,
    events: resolvedEvents,
  }
}

export function sortFlowBuilderPickerAppsConnectedFirst(
  apps: FlowBuilderPickerApp[],
): FlowBuilderPickerApp[] {
  return [...apps].sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

export function buildFlowBuilderIntegrationCatalogApps(input: {
  allowTriggers: boolean
  connectedIntegrationIds: ReadonlySet<string>
  isPlatformAdmin?: boolean
}): FlowBuilderPickerApp[] {
  const catalog = getAvailableIntegrations(input.isPlatformAdmin ?? false).filter(
    (row) => row.is_active !== false && row.category !== 'admin',
  )

  const apps = catalog.map((row) =>
    buildFlowBuilderIntegrationApp(
      row.id,
      row.name,
      input.allowTriggers,
      input.connectedIntegrationIds.has(row.id),
      row.description,
    ),
  )

  return sortFlowBuilderPickerAppsConnectedFirst(apps)
}

/** @deprecated Use buildFlowBuilderIntegrationCatalogApps */
export function buildFlowBuilderIntegrationApps(allowTriggers: boolean): FlowBuilderPickerApp[] {
  return buildFlowBuilderIntegrationCatalogApps({
    allowTriggers,
    connectedIntegrationIds: new Set(),
  })
}

export function buildFlowBuilderBuiltInTools(): FlowBuilderPickerBuiltIn[] {
  return [
    {
      id: 'webhook',
      label: 'Webhook',
      description: 'Receive HTTP requests',
      badgeVariant: 'cyan',
    },
    {
      id: 'branch',
      label: 'Branch',
      description: 'If-then routing based on a field',
      badgeVariant: 'muted',
    },
    {
      id: 'loop',
      label: 'Loop',
      description: 'Loop back to an earlier step',
      badgeVariant: 'muted',
    },
    {
      id: 'human-gate',
      label: 'Human gate',
      description: 'Pause for approval',
      badgeVariant: 'purple',
    },
    {
      id: 'action',
      label: 'Action',
      description: 'Comments, messages, updates',
      badgeVariant: 'orange',
    },
  ]
}

export function buildFlowBuilderProductTools(): FlowBuilderPickerBuiltIn[] {
  return [
    {
      id: 'agent',
      label: 'Agent',
      description: 'Hand off to an agent',
      badgeVariant: 'green',
    },
    {
      id: 'skill',
      label: 'Skill',
      description: 'Run a team skill',
      badgeVariant: 'cyan',
    },
    {
      id: 'brain',
      label: 'Brain',
      description: 'Read or write brain context',
      badgeVariant: 'purple',
    },
    {
      id: 'space',
      label: 'Space',
      description: 'Create or update space items',
      badgeVariant: 'yellow',
    },
  ]
}

export function filterPickerApps(
  apps: FlowBuilderPickerApp[],
  query: string,
  allowTriggers: boolean,
): FlowBuilderPickerApp[] {
  const q = query.trim().toLowerCase()

  const filtered = !q
    ? apps
    : apps
        .map((app) => {
          const labelMatch = app.label.toLowerCase().includes(q)
          const descriptionMatch = app.description?.toLowerCase().includes(q) ?? false
          const matchingEvents = app.events.filter(
            (event) =>
              event.label.toLowerCase().includes(q) ||
              (event.description?.toLowerCase().includes(q) ?? false),
          )
          if (labelMatch || descriptionMatch) return app
          if (matchingEvents.length === 0) return null
          return { ...app, events: matchingEvents }
        })
        .filter((app): app is FlowBuilderPickerApp => app !== null)

  if (allowTriggers) return filtered

  return filtered
    .map((app) => ({
      ...app,
      events: app.events.filter((event) => event.selection.kind !== 'trigger'),
    }))
    .filter((app) => app.events.length > 0)
}

export function filterPickerBuiltIns(
  rows: FlowBuilderPickerBuiltIn[],
  query: string,
): FlowBuilderPickerBuiltIn[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (row) =>
      row.label.toLowerCase().includes(q) || row.description.toLowerCase().includes(q),
  )
}

export function splitPickerAppsByConnection(apps: FlowBuilderPickerApp[]): {
  connected: FlowBuilderPickerApp[]
  available: FlowBuilderPickerApp[]
} {
  const connected: FlowBuilderPickerApp[] = []
  const available: FlowBuilderPickerApp[] = []
  for (const app of apps) {
    if (app.connected) connected.push(app)
    else available.push(app)
  }
  return { connected, available }
}
