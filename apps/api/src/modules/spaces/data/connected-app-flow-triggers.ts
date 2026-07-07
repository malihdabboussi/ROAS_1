export type ConnectedAppFlowProvider =
  | 'googlecalendar'
  | 'googledrive'
  | 'googlesheets'
  | 'salesforce'
  | 'github'
  | 'notion'

export type ConnectedAppFlowTrigger = {
  provider: ConnectedAppFlowProvider
  providerLabel: string
  toolkitSlug: ConnectedAppFlowProvider
  triggerSlug: string
  eventLabel: string
  requiredConfigKeys?: readonly string[]
}

export const CONNECTED_APP_FLOW_TRIGGERS = [
  {
    provider: 'googlecalendar',
    providerLabel: 'Google Calendar',
    toolkitSlug: 'googlecalendar',
    triggerSlug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
    eventLabel: 'Event starting soon',
  },
  {
    provider: 'googlecalendar',
    providerLabel: 'Google Calendar',
    toolkitSlug: 'googlecalendar',
    triggerSlug: 'GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER',
    eventLabel: 'Event created',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    toolkitSlug: 'googledrive',
    triggerSlug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
    eventLabel: 'File created',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    toolkitSlug: 'googledrive',
    triggerSlug: 'GOOGLEDRIVE_FILE_UPDATED_TRIGGER',
    eventLabel: 'File updated',
  },
  {
    provider: 'googledrive',
    providerLabel: 'Google Drive',
    toolkitSlug: 'googledrive',
    triggerSlug: 'GOOGLEDRIVE_COMMENT_ADDED_TRIGGER',
    eventLabel: 'Comment added',
  },
  {
    provider: 'googlesheets',
    providerLabel: 'Google Sheets',
    toolkitSlug: 'googlesheets',
    triggerSlug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
    eventLabel: 'New rows',
    requiredConfigKeys: ['spreadsheet_id'],
  },
  {
    provider: 'googlesheets',
    providerLabel: 'Google Sheets',
    toolkitSlug: 'googlesheets',
    triggerSlug: 'GOOGLESHEETS_SPREADSHEET_ROW_CHANGED_TRIGGER',
    eventLabel: 'Spreadsheet row changed',
    requiredConfigKeys: ['spreadsheet_id'],
  },
  {
    provider: 'salesforce',
    providerLabel: 'Salesforce',
    toolkitSlug: 'salesforce',
    triggerSlug: 'SALESFORCE_NEW_LEAD_TRIGGER',
    eventLabel: 'New lead',
  },
  {
    provider: 'salesforce',
    providerLabel: 'Salesforce',
    toolkitSlug: 'salesforce',
    triggerSlug: 'SALESFORCE_NEW_OR_UPDATED_OPPORTUNITY_TRIGGER',
    eventLabel: 'New or updated opportunity',
  },
  {
    provider: 'github',
    providerLabel: 'GitHub',
    toolkitSlug: 'github',
    triggerSlug: 'GITHUB_ISSUE_CREATED_TRIGGER',
    eventLabel: 'Issue created',
  },
  {
    provider: 'github',
    providerLabel: 'GitHub',
    toolkitSlug: 'github',
    triggerSlug: 'GITHUB_DEPLOYMENT_STATE_CHANGED_TRIGGER',
    eventLabel: 'Deployment state changed',
  },
  {
    provider: 'notion',
    providerLabel: 'Notion',
    toolkitSlug: 'notion',
    triggerSlug: 'NOTION_PAGE_ADDED_TO_DATABASE',
    eventLabel: 'Page added to database',
    requiredConfigKeys: ['database_id'],
  },
  {
    provider: 'notion',
    providerLabel: 'Notion',
    toolkitSlug: 'notion',
    triggerSlug: 'NOTION_PAGE_CONTENT_UPDATED',
    eventLabel: 'Page content updated',
  },
] as const satisfies readonly ConnectedAppFlowTrigger[]

export const CONNECTED_APP_FLOW_TRIGGER_SLUGS = CONNECTED_APP_FLOW_TRIGGERS.map(
  (t) => t.triggerSlug,
)
export const CONNECTED_APP_FLOW_PROVIDERS = [
  ...new Set(CONNECTED_APP_FLOW_TRIGGERS.map((t) => t.provider)),
] as ConnectedAppFlowProvider[]

export function getConnectedAppFlowTriggerBySlug(slug: string): ConnectedAppFlowTrigger | null {
  return CONNECTED_APP_FLOW_TRIGGERS.find((t) => t.triggerSlug === slug) ?? null
}

export function connectedAppFlowProviderMatchesSlug(
  provider: string,
  triggerSlug: string,
): boolean {
  return getConnectedAppFlowTriggerBySlug(triggerSlug)?.provider === provider
}

export function listConnectedAppFlowTriggersByProvider(
  provider: string,
): ConnectedAppFlowTrigger[] {
  return CONNECTED_APP_FLOW_TRIGGERS.filter((t) => t.provider === provider)
}
