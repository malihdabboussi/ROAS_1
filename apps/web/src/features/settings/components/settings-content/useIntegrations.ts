'use client'

import { useCallback, useMemo, useState } from 'react'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { isMetaIntegrationsLibraryEligible } from '@/features/settings/lib/meta-integrations-library-eligibility'
import { billingApi } from '@/features/settings/services/billing-api'
import type { BillingStatusResponse } from '@/features/settings/types/billing.types'
import { useUserRole } from '@/hooks/use-user-role'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { buildComposioProxyCallbackUrl } from '@/lib/integrations/composio-oauth'
import { getAvailableIntegrations } from '@/lib/integrations/integration-catalog'
import { SETTINGS_TOAST_ERRORS } from '../../config/settings-toast-errors.config'
import type { Integration, UserIntegration } from './integrations.types'

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

export type ConnectIntegrationOptions = {
  connectionScope?: 'personal' | 'org_shared'
  /** Start a new OAuth account even if one is already connected for this provider. */
  forceNew?: boolean
}

export type ConnectIntegrationResult = {
  completedSynchronously?: boolean
}

export function useIntegrations() {
  const { role: platformRole, isSuperadmin } = useUserRole()
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([])
  const [providerModes, setProviderModes] = useState<Record<string, string>>({})
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isOrgContext, hasMinRole } = useOrgStore()
  const isOrg = isOrgContext()
  const canManageOrgShared = hasMinRole('admin')
  const isPlatformAdmin = platformRole === 'admin' || isSuperadmin

  const metaLibraryEligible = useMemo(
    () => isMetaIntegrationsLibraryEligible(platformRole, billingStatus),
    [platformRole, billingStatus],
  )

  const availableIntegrations: Integration[] = useMemo(
    () => getAvailableIntegrations(isPlatformAdmin),
    [isPlatformAdmin],
  )

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setBillingStatus(null)
    try {
      const integrationsById = new Map<string, UserIntegration>()
      const setIntegration = (item: UserIntegration) => {
        integrationsById.set(item.id, item)
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
            org_id:
              integration.org_id === undefined
                ? undefined
                : ((integration.org_id as string | null) ?? null),
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
      } else {
        // Personal context: merge overview, Composio accounts, and Slack.
        // Track which integration_ids have a connected composio account so the
        // third pass (composio overview rows) can skip duplicates correctly.
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
            scope_mode: integration.scope_mode,
            is_default: Boolean(integration.is_default),
            connection_label: integration.connection_label ?? null,
            metadata: integration.metadata,
          })
        }

        const composioConnected = (composioAccounts?.accounts ?? []).filter((account) =>
          ['connected', 'pending', 'needs_reconnect'].includes(
            normalizeComposioAccountStatus(account.status),
          ),
        )
        const mappedComposioIntegrations: UserIntegration[] = composioConnected.flatMap(
          (account) => {
            const slug = account.toolkitSlug || account.toolkit_slug || account.toolkit?.slug || ''
            const integrationId = mapComposioToolkitToIntegrationId(slug)
            if (!integrationId) return []
            composioConnectedIds.add(integrationId)
            return [
              {
                id: account.user_integration_id?.trim() || `composio-${account.id}`,
                integration_id: integrationId,
                provider: integrationId,
                status: normalizeComposioAccountStatus(account.status),
                scope_mode: account.scope_mode ?? undefined,
                is_default: Boolean(account.is_default),
                connection_label: account.connection_label ?? null,
                metadata: {
                  connection_id: account.id,
                  composio_toolkit_slug: slug,
                },
              },
            ]
          },
        )

        for (const integration of mappedComposioIntegrations) {
          setIntegration(integration)
        }

        for (const integration of overviewIntegrations) {
          if (!isComposioMode(integration.integration_id, integration.metadata)) continue
          const overviewStatus = normalizeIntegrationStatus(integration.status)
          const rowId =
            typeof integration.id === 'string' && integration.id.trim().length > 0
              ? integration.id
              : `user-integration-${integration.integration_id}-${integrationsById.size}`
          if (integrationsById.has(rowId)) continue
          if (overviewStatus === 'connected') {
            setIntegration({
              id: rowId,
              integration_id: integration.integration_id,
              provider: integration.provider,
              status: 'connected',
              scope_mode: integration.scope_mode,
              is_default: Boolean(integration.is_default),
              connection_label: integration.connection_label ?? null,
              metadata: integration.metadata,
            })
            continue
          }
          // Skip non-connected overview rows when we already have a composio account for this provider
          if (composioConnectedIds.has(integration.integration_id)) continue
          setIntegration({
            id: rowId,
            integration_id: integration.integration_id,
            provider: integration.provider,
            status: overviewStatus,
            scope_mode: integration.scope_mode,
            is_default: Boolean(integration.is_default),
            connection_label: integration.connection_label ?? null,
            metadata: integration.metadata,
          })
        }

        if (slackStatus?.connected) {
          const existingSlack = [...integrationsById.values()].find(
            (row) => row.integration_id === 'slack',
          )
          const teamName = slackStatus.teamName ?? null
          const teamId = slackStatus.teamId ?? null
          if (existingSlack) {
            const existingMeta = existingSlack.metadata ?? {}
            setIntegration({
              ...existingSlack,
              status: 'connected',
              connection_label:
                existingSlack.connection_label?.trim() ||
                teamName ||
                (typeof existingMeta.team_name === 'string' ? existingMeta.team_name : null) ||
                null,
              created_at: slackStatus.connectedAt ?? existingSlack.created_at,
              metadata: {
                ...existingMeta,
                teamName: teamName ?? existingMeta.teamName ?? existingMeta.team_name,
                teamId: teamId ?? existingMeta.teamId ?? existingMeta.team_id,
                team_name: teamName ?? existingMeta.team_name,
                team_id: teamId ?? existingMeta.team_id,
              },
            })
          } else {
            setIntegration({
              id: 'user-integration-slack',
              integration_id: 'slack',
              provider: 'slack',
              status: 'connected',
              connection_label: teamName,
              created_at: slackStatus.connectedAt ?? undefined,
              metadata: {
                teamName,
                teamId,
                team_name: teamName,
                team_id: teamId,
              },
            })
          }
        }
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
      setError(
        e instanceof Error ? e.message : SETTINGS_TOAST_ERRORS.INTEGRATIONS_LOAD_FAILED.userMessage,
      )
      setUserIntegrations([])
      setBillingStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [isOrg])

  const connectIntegration = useCallback(
    async (
      integration: Integration,
      apiKeyOrData?: string | Record<string, string>,
      options?: ConnectIntegrationOptions,
    ): Promise<ConnectIntegrationResult | void> => {
      setError(null)
      const integrationId = integration.id.toLowerCase()
      const provider = integration.provider.toLowerCase()
      if (!integration.is_active) {
        throw new Error(`${integration.name} is coming soon and cannot be connected yet.`)
      }
      const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
      const callbackUrl =
        typeof window !== 'undefined'
          ? buildComposioProxyCallbackUrl(integrationId, redirectTo)
          : ''
      const connectionData = typeof apiKeyOrData === 'object' ? apiKeyOrData : undefined
      const apiKey = typeof apiKeyOrData === 'string' ? apiKeyOrData : undefined
      const connectionScope = options?.connectionScope
      const forceNew = options?.forceNew === true

      if (provider === 'slack') {
        const returnTo =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : ''
        const qs = new URLSearchParams({ agent_key: 'vibey' })
        if (returnTo) qs.set('return_to', returnTo)
        const res = await backendGet<{ url: string }>(`/api/slack/install?${qs.toString()}`)
        if (!res?.url) throw new Error('Missing Slack install URL')
        window.open(res.url, '_blank', 'noopener,noreferrer')
        return
      }

      if (provider === 'gohighlevel') {
        if (!connectionData?.generic_api_key || !connectionData?.location_id)
          throw new Error('Private Integration Token and Location ID are required')
        await backendPost('/api/integrations/lhg/connect', {
          pit: connectionData.generic_api_key,
          locationId: connectionData.location_id,
        })
        await loadData()
        return { completedSynchronously: true }
      }

      if (provider === 'active_campaign') {
        if (!connectionData?.full || !connectionData?.generic_api_key)
          throw new Error('API URL and API Key are required')
        await backendPost('/api/integrations/active-campaign/connect', {
          apiUrl: connectionData.full,
          apiKey: connectionData.generic_api_key,
        })
        await loadData()
        return
      }

      if (provider === 'page_grader') {
        if (!connectionData?.full || !connectionData?.generic_api_key)
          throw new Error('API Base URL and API Key are required')
        await backendPost('/api/integrations/page-grader/connect', {
          baseUrl: connectionData.full,
          apiKey: connectionData.generic_api_key,
        })
        await loadData()
        return
      }

      if (provider === 'openai_codex') {
        const callbackUrlFromAuth = connectionData?.callbackUrl?.trim()
        if (callbackUrlFromAuth) {
          await backendPost('/api/integrations/openai-codex/callback', {
            callbackUrl: callbackUrlFromAuth,
          })
          await loadData()
          return { completedSynchronously: true }
        }

        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/openai-codex/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if (provider === 'anthropic_claude') {
        const setupToken = connectionData?.setup_token?.trim()
        if (!setupToken) throw new Error('Claude setup token is required')
        await backendPost('/api/integrations/anthropic-claude/connect', { setupToken })
        invalidateCachedFetch('llm-models')
        await loadData()
        return { completedSynchronously: true }
      }

      if (provider === 'higgsfield') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/higgsfield/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing Higgsfield authorize URL')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
        return
      }

      const mode = String(providerModes[integrationId] ?? providerModes[provider] ?? '')
        .trim()
        .toLowerCase()
      const LEGACY_OAUTH_PROVIDERS = new Set([
        'stripe',
        'paypal',
        'meta',
        'calendly',
        'dropbox',
        'fathom',
        'supabase',
        'github',
        'wordpress',
      ])
      const shouldUseComposio =
        mode === 'composio' ||
        (integration.auth_type !== 'api_key' &&
          provider !== 'slack' &&
          !LEGACY_OAUTH_PROVIDERS.has(integrationId))

      if (shouldUseComposio) {
        const res = await backendPost<{
          success: boolean
          redirect_url?: string | null
          reused?: boolean
          error?: string
        }>('/api/integrations/composio/connect', {
          integration_id: integrationId,
          ...(connectionScope ? { connection_scope: connectionScope } : {}),
          ...(forceNew ? { force_new: true } : {}),
          callback_url: callbackUrl || redirectTo,
          long_redirect_url: true,
          ...(connectionData ? { connection_data: connectionData } : {}),
        })
        if (!res?.success) throw new Error(res?.error || 'Failed to initiate connection')

        const redirectUrl =
          typeof res.redirect_url === 'string' && res.redirect_url.trim().length > 0
            ? res.redirect_url.trim()
            : null

        // Adding another account must open OAuth — never treat reuse / missing redirect as success.
        if (forceNew && (res.reused || !redirectUrl)) {
          const detail = res.reused
            ? 'The API reused your existing connection instead of starting a new OAuth link.'
            : 'The API did not return an authorize URL.'
          throw new Error(`${detail} Refresh the page and try Add another account again.`)
        }

        if (connectionData || !redirectUrl) {
          await loadData()
          return { completedSynchronously: true }
        }
        window.open(redirectUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if (provider === 'stripe') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/stripe/connect',
          { redirectTo, ...(connectionScope ? { connection_scope: connectionScope } : {}) },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'paypal') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/paypal/connect',
          { redirectTo, ...(connectionScope ? { connection_scope: connectionScope } : {}) },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'meta') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/meta/connect',
          { redirectTo, ...(connectionScope ? { connection_scope: connectionScope } : {}) },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'calendly') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/calendly/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'dropbox') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/dropbox/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'fathom') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/fathom/connect',
          { redirectTo, ...(connectionScope ? { connection_scope: connectionScope } : {}) },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'wordpress') {
        const method = String(connectionData?.connection_method ?? '')
        if (method !== 'wordpress_com' && method !== 'self_hosted') {
          throw new Error('Choose a WordPress connection method')
        }
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/wordpress/connect',
          {
            connection_method: method,
            redirectTo,
            ...(connectionData?.siteUrl ? { siteUrl: connectionData.siteUrl } : {}),
            ...(connectionScope ? { connection_scope: connectionScope } : {}),
          },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'fireflies') {
        const firefliesApiKey = connectionData?.api_key?.trim() || apiKey
        if (!firefliesApiKey) throw new Error('API key required')
        const firefliesWebhookSecret = connectionData?.webhook_secret?.trim()
        await backendPost('/api/integrations/fireflies/connect', {
          apiKey: firefliesApiKey,
          ...(firefliesWebhookSecret ? { webhookSecret: firefliesWebhookSecret } : {}),
        })
        await loadData()
        return { completedSynchronously: true }
      } else if (provider === 'cursor') {
        if (!connectionData?.api_key) throw new Error('API key required')
        await backendPost('/api/integrations/cursor/connect', {
          apiKey: connectionData.api_key,
          webhookSecret: connectionData.webhook_secret,
          connectionScope,
        })
        await loadData()
        return { completedSynchronously: true }
      } else if (provider === 'fanbasis') {
        if (!apiKey) throw new Error('API key required')
        await backendPost('/api/integrations/fanbasis/connect', { apiKey })
        await loadData()
        return { completedSynchronously: true }
      } else if (provider === 'google_workspace') {
        const serviceAccountJson = connectionData?.service_account_json?.trim()
        const workspaceAdminEmail = connectionData?.workspace_admin_email?.trim()
        if (!serviceAccountJson || !workspaceAdminEmail) {
          throw new Error('Service account JSON and Workspace admin email are required')
        }
        await backendPost('/api/integrations/google-workspace/connect', {
          service_account_json: serviceAccountJson,
          workspace_admin_email: workspaceAdminEmail,
        })
        await loadData()
        return { completedSynchronously: true }
      } else if (provider === 'supabase') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/supabase/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error(`Unknown provider: ${integrationId}`)
      }
    },
    [loadData, providerModes],
  )

  const refreshIntegration = useCallback(
    async (_userIntegration: UserIntegration) => {
      setError(null)
      await loadData()
    },
    [loadData],
  )

  const disconnectIntegration = useCallback(
    async (userIntegration: UserIntegration) => {
      setError(null)
      const integrationId = userIntegration.integration_id.toLowerCase()
      const provider = userIntegration.provider.toLowerCase()
      const subscriptionDisconnectPath = getAdminSubscriptionDisconnectPath(integrationId)

      if (provider === 'slack') {
        await backendPost('/api/slack/disconnect', {})
        await loadData()
        return
      }

      if (provider === 'active_campaign') {
        await backendPost('/api/integrations/active-campaign/disconnect', {})
        await loadData()
        return
      }

      if (provider === 'page_grader') {
        await backendPost('/api/integrations/page-grader/disconnect', {})
        await loadData()
        return
      }

      if (provider === 'higgsfield') {
        await backendPost('/api/integrations/higgsfield/disconnect', {})
        await loadData()
        return
      }

      if (subscriptionDisconnectPath) {
        await backendPost(subscriptionDisconnectPath, {})
        invalidateCachedFetch('llm-models')
        await loadData()
        return
      }

      const mode = String(providerModes[integrationId] ?? providerModes[provider] ?? '')
        .trim()
        .toLowerCase()

      if (mode === 'composio') {
        const connectionId = resolveComposioConnectionId(userIntegration.metadata)
        if (!connectionId && !userIntegration.id) {
          throw new Error(`Missing Composio connection id for ${provider}`)
        }
        await backendPost('/api/integrations/composio/disconnect', {
          ...(userIntegration.id ? { user_integration_id: userIntegration.id } : {}),
          ...(connectionId ? { connection_id: connectionId } : {}),
          integration_id: userIntegration.integration_id,
        })
        await loadData()
        return
      }

      if (provider === 'gohighlevel') {
        await backendPost('/api/integrations/lhg/disconnect', {})
      } else if (provider === 'stripe') {
        await backendPost('/api/integrations/stripe/disconnect', {})
      } else if (provider === 'paypal') {
        await backendPost('/api/integrations/paypal/disconnect', {})
      } else if (provider === 'meta') {
        await backendPost('/api/integrations/meta/disconnect', {})
      } else if (provider === 'calendly') {
        await backendPost('/api/integrations/calendly/disconnect', {})
      } else if (provider === 'dropbox') {
        await backendPost('/api/integrations/dropbox/disconnect', {})
      } else if (provider === 'fathom') {
        await backendPost('/api/integrations/fathom/disconnect', {})
      } else if (provider === 'wordpress') {
        await backendPost('/api/integrations/wordpress/disconnect', {})
      } else if (provider === 'fireflies') {
        await backendPost('/api/integrations/fireflies/disconnect', {})
      } else if (provider === 'cursor') {
        await backendPost('/api/integrations/cursor/disconnect', {
          connectionId: userIntegration.id,
        })
      } else if (provider === 'fanbasis') {
        await backendPost('/api/integrations/fanbasis/disconnect', {})
      } else if (provider === 'google_workspace') {
        await backendPost('/api/integrations/google-workspace/disconnect', {})
      } else if (provider === 'supabase') {
        await backendPost('/api/integrations/supabase/disconnect', {})
      }

      await loadData()
    },
    [loadData, providerModes],
  )

  const removeIntegration = useCallback(
    async (userIntegration: UserIntegration) => {
      setError(null)
      const integrationId = userIntegration.integration_id.toLowerCase()
      const provider = userIntegration.provider.toLowerCase()
      const subscriptionDisconnectPath = getAdminSubscriptionDisconnectPath(integrationId)

      if (provider === 'slack') {
        await backendDelete('/api/slack/remove')
      } else {
        if (subscriptionDisconnectPath) {
          await backendPost(subscriptionDisconnectPath, {})
          invalidateCachedFetch('llm-models')
        }
        if (userIntegration.id) {
          await backendDelete(
            `/api/integrations/remove-connection/${encodeURIComponent(userIntegration.id)}`,
          )
        } else {
          await backendDelete(
            `/api/integrations/remove/${encodeURIComponent(userIntegration.integration_id)}`,
          )
        }
      }
      await loadData()
    },
    [loadData],
  )

  const setDefaultOrgSharedIntegration = useCallback(
    async (userIntegration: UserIntegration) => {
      if (!userIntegration.id) throw new Error('Missing integration connection id')
      await backendPatch('/api/integrations/connection/default', {
        user_integration_id: userIntegration.id,
      })
      await loadData()
    },
    [loadData],
  )

  const changeIntegrationScope = useCallback(
    async (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => {
      if (!userIntegration.id) throw new Error('Missing integration connection id')
      await backendPatch('/api/integrations/connection/scope', {
        user_integration_id: userIntegration.id,
        scope_mode: newScope,
      })
      await loadData()
    },
    [loadData],
  )

  const renameIntegrationConnection = useCallback(
    async (userIntegration: UserIntegration, connectionLabel: string) => {
      if (!userIntegration.id) throw new Error('Missing integration connection id')
      await backendPatch('/api/integrations/connection/label', {
        user_integration_id: userIntegration.id,
        connection_label: connectionLabel,
      })
      setUserIntegrations((prev) =>
        prev.map((row) =>
          row.id === userIntegration.id ? { ...row, connection_label: connectionLabel } : row,
        ),
      )
    },
    [],
  )

  const filteredIntegrations = availableIntegrations

  return {
    availableIntegrations: filteredIntegrations,
    userIntegrations,
    providerModes,
    metaLibraryEligible,
    isLoading,
    error,
    loadData,
    connectIntegration,
    refreshIntegration,
    disconnectIntegration,
    removeIntegration,
    setDefaultOrgSharedIntegration,
    changeIntegrationScope,
    renameIntegrationConnection,
    canManageOrgShared,
  }
}

function mapComposioToolkitToIntegrationId(toolkitSlug: string): string | null {
  const slug = toolkitSlug.trim().toLowerCase()
  if (!slug) return null

  const mapping: Record<string, string> = {
    'google-drive': 'google_drive',
    googledrive: 'google_drive',
    googleanalytics: 'google_analytics',
    'google-analytics': 'google_analytics',
    google_analytics: 'google_analytics',
    googlecalendar: 'google_calendar',
    'google-calendar': 'google_calendar',
    gmail: 'gmail',
    outlook: 'outlook',
    linkedin: 'linkedin',
    instagram: 'instagram',
    twitter: 'twitter',
    youtube: 'youtube',
    tiktok: 'tiktok',
    slack: 'slack',
    github: 'github',
    clickup: 'clickup',
    notion: 'notion',
    facebook: 'facebook',
    reddit: 'reddit',
    mailchimp: 'mailchimp',
    kit: 'kit',
    klaviyo: 'klaviyo',
    hubspot: 'hubspot',
    salesforce: 'salesforce',
    zoom: 'zoom',
    googledocs: 'google_docs',
    'google-docs': 'google_docs',
    google_docs: 'google_docs',
    googlesheets: 'google_sheets',
    'google-sheets': 'google_sheets',
    google_sheets: 'google_sheets',
    airtable: 'airtable',
    googleads: 'google_ads',
    'google-ads': 'google_ads',
    google_ads: 'google_ads',
    google_search_console: 'google_search_console',
    'google-search-console': 'google_search_console',
    canva: 'canva',
    vercel: 'vercel',
    active_campaign: 'active_campaign',
    activecampaign: 'active_campaign',
    'active-campaign': 'active_campaign',
    whop: 'whop',
    wordpress: 'wordpress',
  }

  return mapping[slug] || null
}

function normalizeComposioAccountStatus(
  status: string | null | undefined,
): UserIntegration['status'] {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase()
  if (normalized === 'ACTIVE') return 'connected'
  if (normalized === 'INITIATED' || normalized === 'PENDING') return 'pending'
  if (normalized === 'FAILED' || normalized === 'ERROR') return 'error'
  if (normalized === 'EXPIRED' || normalized === 'INACTIVE' || normalized === 'REVOKED')
    return 'needs_reconnect'
  return 'disconnected'
}

function normalizeIntegrationStatus(status: string | null | undefined): UserIntegration['status'] {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'connected') return 'connected'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'error') return 'error'
  if (normalized === 'needs_reconnect' || normalized === 'needs-reconnect') return 'needs_reconnect'
  return 'disconnected'
}

export function getAdminSubscriptionDisconnectPath(integrationId: string): string | null {
  const normalized = integrationId.trim().toLowerCase()
  if (normalized === 'openai_codex') return '/api/integrations/openai-codex/disconnect'
  if (normalized === 'anthropic_claude') return '/api/integrations/anthropic-claude/disconnect'
  return null
}

function resolveComposioConnectionId(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null

  const candidates = [
    metadata.connection_id,
    metadata.composio_connected_account_id,
    metadata.connected_account_id,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}
