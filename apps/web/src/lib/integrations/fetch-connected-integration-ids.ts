import { backendGet } from '@/lib/api/backend-client'
import {
  mapComposioToolkitToIntegrationId,
  normalizeComposioAccountStatus,
  normalizeIntegrationStatus,
} from './integration-status-utils'
import type { UserIntegration } from './integrations.types'

type IntegrationsOverviewResponse = {
  connectedProviders?: string[]
  providerModes?: Record<string, string>
  integrations?: Array<{
    integration_id: string
    provider: string
    status: string
    metadata?: Record<string, unknown>
  }>
}

type SlackStatusResponse = {
  connected: boolean
}

type ComposioAccountsResponse = {
  accounts?: Array<{
    id: string
    status: string
    toolkitSlug?: string
    toolkit_slug?: string
    toolkit?: { slug?: string }
  }>
}

const LINKED_STATUSES = new Set<UserIntegration['status']>([
  'connected',
  'pending',
  'needs_reconnect',
])

function isLinkedIntegrationStatus(status: UserIntegration['status']): boolean {
  return LINKED_STATUSES.has(status)
}

function addLinkedId(ids: Set<string>, integrationId: string | null | undefined) {
  if (integrationId) ids.add(integrationId)
}

export async function fetchConnectedIntegrationIds(options: {
  isOrg: boolean
}): Promise<Set<string>> {
  const ids = new Set<string>()

  const [overview, slackStatus, composioAccounts] = await Promise.all([
    backendGet<IntegrationsOverviewResponse>('/api/integrations/overview').catch(() => null),
    options.isOrg
      ? Promise.resolve(null)
      : backendGet<SlackStatusResponse>('/api/slack/status').catch(() => null),
    options.isOrg
      ? Promise.resolve(null)
      : backendGet<ComposioAccountsResponse>('/api/integrations/composio/accounts').catch(
          () => null,
        ),
  ])

  const overviewIntegrations = overview?.integrations ?? []
  const providerModeLookup = overview?.providerModes ?? {}

  const isComposioMode = (integrationId: string, metadata?: Record<string, unknown>) => {
    const metadataMode = String(metadata?.execution_mode ?? '')
      .trim()
      .toLowerCase()
    if (metadataMode === 'composio' || metadataMode === 'legacy') return metadataMode === 'composio'
    return (
      String(providerModeLookup[integrationId] ?? '')
        .trim()
        .toLowerCase() === 'composio'
    )
  }

  if (options.isOrg) {
    for (const row of overviewIntegrations) {
      const status = normalizeIntegrationStatus(row.status)
      if (isLinkedIntegrationStatus(status)) {
        addLinkedId(ids, row.integration_id)
      }
    }
    return ids
  }

  const composioConnectedIds = new Set<string>()

  for (const row of overviewIntegrations) {
    if (isComposioMode(row.integration_id, row.metadata)) continue
    const status = normalizeIntegrationStatus(row.status)
    if (isLinkedIntegrationStatus(status)) {
      addLinkedId(ids, row.integration_id)
    }
  }

  for (const account of composioAccounts?.accounts ?? []) {
    const status = normalizeComposioAccountStatus(account.status)
    if (!isLinkedIntegrationStatus(status)) continue
    const slug = account.toolkitSlug || account.toolkit_slug || account.toolkit?.slug || ''
    const integrationId = mapComposioToolkitToIntegrationId(slug)
    if (!integrationId) continue
    composioConnectedIds.add(integrationId)
    addLinkedId(ids, integrationId)
  }

  for (const row of overviewIntegrations) {
    if (!isComposioMode(row.integration_id, row.metadata)) continue
    const status = normalizeIntegrationStatus(row.status)
    if (status === 'connected') {
      addLinkedId(ids, row.integration_id)
      continue
    }
    if (composioConnectedIds.has(row.integration_id)) continue
    if (isLinkedIntegrationStatus(status)) {
      addLinkedId(ids, row.integration_id)
    }
  }

  if (slackStatus?.connected) {
    ids.add('slack')
  }

  for (const provider of overview?.connectedProviders ?? []) {
    addLinkedId(ids, provider)
  }

  return ids
}
