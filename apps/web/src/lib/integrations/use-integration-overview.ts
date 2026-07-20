'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUserRole } from '@/hooks/use-user-role'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { billingApi } from '@/lib/billing/billing-api'
import type { BillingStatusResponse } from '@/lib/billing/billing.types'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { useOrgStore } from '@/lib/org/org-context-store'
import { buildComposioProxyCallbackUrl } from './composio-oauth'
import { getAvailableIntegrations } from './integration-catalog'
import {
  mapComposioToolkitToIntegrationId,
  normalizeComposioAccountStatus,
  normalizeIntegrationStatus,
} from './integration-status-utils'
import type { Integration, UserIntegration } from './integrations.types'
import { isMetaIntegrationsLibraryEligible } from './meta-integrations-library-eligibility'

type IntegrationsOverviewResponse = {
  success: boolean
  connectedProviders: string[]
  providerModes?: Record<string, string>
  integrations: Array<{
    id?: string
    user_id?: string
    org_id?: string | null
    integration_id: string
    provider: string
    status: string
    scope_mode?: 'personal' | 'org_shared'
    is_default?: boolean
    connection_label?: string | null
    metadata?: Record<string, unknown>
  }>
}

type SlackStatusResponse = {
  success: boolean
  connected: boolean
  status: string | null
  teamName: string | null
  teamId: string | null
  connectedAt: string | null
}

type ComposioAccountsResponse = {
  success: boolean
  accounts: Array<{
    id: string
    user_integration_id?: string
    status: string
    connection_label?: string | null
    scope_mode?: 'personal' | 'org_shared' | null
    is_default?: boolean
    toolkitSlug?: string
    toolkit_slug?: string
    toolkit?: { slug?: string }
  }>
}

export function useIntegrationOverview() {
  const { role: platformRole, isSuperadmin } = useUserRole()
  const { isOrgContext, hasMinRole } = useOrgStore()
  const isOrg = isOrgContext()
  const canManageOrgShared = hasMinRole('admin')
  const isPlatformAdmin = platformRole === 'admin' || isSuperadmin
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([])
  const [providerModes, setProviderModes] = useState<Record<string, string>>({})
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const availableIntegrations = useMemo(
    () => getAvailableIntegrations(isPlatformAdmin),
    [isPlatformAdmin],
  )

  const metaLibraryEligible = useMemo(
    () => isMetaIntegrationsLibraryEligible(platformRole, billingStatus),
    [platformRole, billingStatus],
  )

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setBillingStatus(null)
    try {
      const integrationsById = new Map<string, UserIntegration>()
      const setIntegration = (item: UserIntegration) => {
        integrationsById.set(item.integration_id, item)
      }
      const [overview, slackStatus, composioAccounts, billing] = await Promise.all([
        backendGet<IntegrationsOverviewResponse>('/api/integrations/overview').catch(() => null),
        isOrg
          ? Promise.resolve(null)
          : backendGet<SlackStatusResponse>('/api/slack/status').catch(() => null),
        isOrg
          ? Promise.resolve(null)
          : backendGet<ComposioAccountsResponse>('/api/integrations/composio/accounts').catch(
              () => null,
            ),
        billingApi.getStatus().catch(() => null),
      ])
      setBillingStatus(billing)

      const overviewIntegrations = overview?.integrations ?? []
      const providerModeLookup = overview?.providerModes ?? {}
      setProviderModes(providerModeLookup)
      const isComposioMode = (integrationId: string, metadata?: Record<string, unknown>) => {
        const metadataMode = String(metadata?.execution_mode ?? '')
          .trim()
          .toLowerCase()
        if (metadataMode === 'composio' || metadataMode === 'legacy')
          return metadataMode === 'composio'
        return (
          String(providerModeLookup[integrationId] ?? '')
            .trim()
            .toLowerCase() === 'composio'
        )
      }

      if (isOrg) {
        const orgIntegrations: UserIntegration[] = overviewIntegrations.map(
          (integration, index) => ({
            id:
              typeof integration.id === 'string' && integration.id.trim().length > 0
                ? integration.id
                : `user-integration-${integration.integration_id}-${index}`,
            user_id: integration.user_id,
            integration_id: integration.integration_id,
            provider: integration.provider,
            status: normalizeIntegrationStatus(integration.status),
            scope_mode: integration.scope_mode,
            is_default: Boolean(integration.is_default),
            connection_label: integration.connection_label ?? null,
            metadata: integration.metadata,
          }),
        )
        if (
          orgIntegrations.some((integration) =>
            ['openai_codex', 'anthropic_claude'].includes(integration.integration_id),
          )
        ) {
          invalidateCachedFetch('llm-models')
        }
        setUserIntegrations(orgIntegrations)
        return
      }

      const composioConnectedIds = new Set<string>()
      for (const integration of overviewIntegrations) {
        if (isComposioMode(integration.integration_id, integration.metadata)) continue
        const rowId =
          typeof integration.id === 'string' && integration.id.trim().length > 0
            ? integration.id
            : `user-integration-${integration.integration_id}-${integrationsById.size}`
        setIntegration({
          id: rowId,
          integration_id: integration.integration_id,
          provider: integration.provider,
          status: normalizeIntegrationStatus(integration.status),
          metadata: integration.metadata,
        })
      }

      const composioConnected = (composioAccounts?.accounts ?? []).filter((account) =>
        ['connected', 'pending', 'needs_reconnect'].includes(
          normalizeComposioAccountStatus(account.status),
        ),
      )
      for (const account of composioConnected) {
        const slug = account.toolkitSlug || account.toolkit_slug || account.toolkit?.slug || ''
        const integrationId = mapComposioToolkitToIntegrationId(slug)
        if (!integrationId) continue
        composioConnectedIds.add(integrationId)
        setIntegration({
          id: account.user_integration_id?.trim() || `composio-${account.id}`,
          integration_id: integrationId,
          provider: integrationId,
          status: normalizeComposioAccountStatus(account.status),
          scope_mode: account.scope_mode ?? undefined,
          is_default: Boolean(account.is_default),
          connection_label: account.connection_label ?? null,
          metadata: { connection_id: account.id, composio_toolkit_slug: slug },
        })
      }

      for (const integration of overviewIntegrations) {
        if (!isComposioMode(integration.integration_id, integration.metadata)) continue
        const overviewStatus = normalizeIntegrationStatus(integration.status)
        const rowId =
          typeof integration.id === 'string' && integration.id.trim().length > 0
            ? integration.id
            : `user-integration-${integration.integration_id}-${integrationsById.size}`
        if (overviewStatus === 'connected') {
          setIntegration({
            id: rowId,
            integration_id: integration.integration_id,
            provider: integration.provider,
            status: 'connected',
            metadata: integration.metadata,
          })
        } else if (!composioConnectedIds.has(integration.integration_id)) {
          setIntegration({
            id: rowId,
            integration_id: integration.integration_id,
            provider: integration.provider,
            status: overviewStatus,
            metadata: integration.metadata,
          })
        }
      }

      if (slackStatus?.connected) {
        setIntegration({
          id: 'user-integration-slack',
          integration_id: 'slack',
          provider: 'slack',
          status: 'connected',
          created_at: slackStatus.connectedAt ?? undefined,
          metadata: {
            teamName: slackStatus.teamName,
            teamId: slackStatus.teamId,
          },
        })
      }

      const finalIntegrations = [...integrationsById.values()]
      if (
        finalIntegrations.some((integration) =>
          ['openai_codex', 'anthropic_claude'].includes(integration.integration_id),
        )
      ) {
        invalidateCachedFetch('llm-models')
      }
      setUserIntegrations(finalIntegrations)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations.')
      setUserIntegrations([])
      setBillingStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [isOrg])

  const connectIntegration = useCallback(
    async (integration: Integration) => {
      setError(null)
      const integrationId = integration.id.toLowerCase()
      const provider = integration.provider.toLowerCase()
      const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
      const callbackUrl =
        typeof window !== 'undefined'
          ? buildComposioProxyCallbackUrl(integrationId, redirectTo)
          : ''
      const mode = String(providerModes[integrationId] ?? providerModes[provider] ?? '')
        .trim()
        .toLowerCase()

      if (mode === 'composio') {
        const res = await backendPost<{
          success: boolean
          redirect_url?: string
          error?: string
        }>('/api/integrations/composio/connect', {
          integration_id: integrationId,
          callback_url: callbackUrl || redirectTo,
          long_redirect_url: true,
        })
        if (!res?.success) throw new Error(res?.error || 'Failed to initiate connection')
        if (res.redirect_url) window.open(res.redirect_url, '_blank', 'noopener,noreferrer')
        else await loadData()
        return
      }

      if (provider !== 'meta') throw new Error(`Unknown provider: ${integrationId}`)
      const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
        '/api/integrations/meta/connect',
        { redirectTo },
      )
      if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
      window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
    },
    [loadData, providerModes],
  )

  return {
    availableIntegrations,
    userIntegrations,
    providerModes,
    metaLibraryEligible,
    isLoading,
    error,
    loadData,
    connectIntegration,
    canManageOrgShared,
  }
}
