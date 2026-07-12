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
import { buildPlatformWebhookUrl } from '@/lib/platform/platform-urls'
import { SETTINGS_TOAST_ERRORS } from '../../config/settings-toast-errors.config'
import type { Integration, UserIntegration } from './integrations.types'

type IntegrationsOverviewResponse = {
  success: boolean
  connectedProviders: string[]
  providerModes?: Record<string, string>
  integrations: Array<{
    id?: string
    user_id?: string
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
    () => [
      {
        id: 'linkedin',
        provider: 'linkedin',
        name: 'LinkedIn',
        description: 'Connect LinkedIn to read profile/page data and publish social content.',
        category: 'social',
        is_active: true,
      },
      {
        id: 'instagram',
        provider: 'instagram',
        name: 'Instagram',
        description: 'Connect Instagram to manage social posting and media insights.',
        category: 'social',
        is_active: true,
      },
      {
        id: 'facebook',
        provider: 'facebook',
        name: 'Facebook',
        description: 'Connect Facebook to manage pages, posts, and audience engagement.',
        category: 'social',
        is_active: true,
      },
      {
        id: 'youtube',
        provider: 'youtube',
        name: 'YouTube',
        description: 'Connect YouTube to read channel/video data and publish supported content.',
        category: 'social',
        is_active: true,
      },
      {
        id: 'twitter',
        provider: 'twitter',
        name: 'X (Twitter)',
        description: 'Connect X to publish and read social conversations and post performance.',
        category: 'social',
        is_active: false,
      },
      {
        id: 'tiktok',
        provider: 'tiktok',
        name: 'TikTok',
        description: 'Connect TikTok to access social performance data and publishing actions.',
        category: 'social',
        is_active: false,
      },
      {
        id: 'reddit',
        provider: 'reddit',
        name: 'Reddit',
        description:
          'Connect Reddit to monitor subreddits, post content, and engage with communities.',
        category: 'social',
        is_active: true,
      },
      {
        id: 'meta',
        provider: 'meta',
        name: 'Meta Ads',
        description: 'Connect Meta to publish Facebook and Instagram ads directly from Vibey.',
        category: 'ads_analytics',
        is_active: true,
      },
      {
        id: 'google_ads',
        provider: 'google_ads',
        name: 'Google Ads',
        description:
          'Connect Google Ads to manage campaigns, ad groups, keywords, and performance reports.',
        category: 'ads_analytics',
        is_active: true,
      },
      {
        id: 'google_analytics',
        provider: 'google_analytics',
        name: 'Google Analytics',
        description:
          'Connect Google Analytics to access website traffic, audience data, and conversion insights.',
        category: 'ads_analytics',
        is_active: true,
      },
      {
        id: 'google_search_console',
        provider: 'google_search_console',
        name: 'Google Search Console',
        description:
          'Connect Google Search Console to monitor search performance, indexing, and site health.',
        category: 'ads_analytics',
        is_active: true,
      },
      {
        id: 'gmail',
        provider: 'gmail',
        name: 'Gmail',
        description: 'Connect Gmail to manage emails, drafts, and inbox operations.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'outlook',
        provider: 'outlook',
        name: 'Microsoft Outlook',
        description:
          'Connect Outlook to read and send email, manage calendar, contacts, and mailbox settings.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'slack',
        provider: 'slack',
        name: 'Slack',
        description: 'Connect Slack so your agents can respond in Slack channels and DMs.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'mailchimp',
        provider: 'mailchimp',
        name: 'Mailchimp',
        description: 'Connect Mailchimp to manage email lists, campaigns, and audience segments.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'kit',
        provider: 'kit',
        name: 'Kit (ConvertKit)',
        description: 'Connect Kit to manage email subscribers, automations, and broadcasts.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'active_campaign',
        provider: 'active_campaign',
        name: 'ActiveCampaign',
        description:
          'Connect ActiveCampaign to manage contacts, automations, deals, and email marketing campaigns.',
        category: 'email_marketing',
        auth_type: 'api_key',
        connection_fields: [
          {
            name: 'full',
            label: 'API URL',
            placeholder: 'https://youraccount.api-us1.com',
            required: true,
          },
          {
            name: 'generic_api_key',
            label: 'API Key',
            placeholder: 'Enter your ActiveCampaign API key',
            required: true,
          },
        ],
        is_active: true,
      },
      {
        id: 'gohighlevel',
        provider: 'gohighlevel',
        name: 'GoHighLevel',
        description: 'OAuth connection used for sending via GoHighLevel.',
        category: 'email_marketing',
        is_active: true,
      },
      {
        id: 'stripe',
        provider: 'stripe',
        name: 'Stripe',
        description:
          'Connect Stripe to manage products, prices, payment links, refunds, and analytics.',
        category: 'payments',
        is_active: true,
      },
      {
        id: 'paypal',
        provider: 'paypal',
        name: 'PayPal',
        description:
          'Connect PayPal to view transactions, payments, refunds, and balance via Log in with PayPal.',
        category: 'payments',
        is_active: true,
      },
      {
        id: 'whop',
        provider: 'whop',
        name: 'Whop',
        description: 'Connect Whop to manage memberships, payments, plans, and community members.',
        category: 'payments',
        auth_type: 'api_key',
        connection_fields: [
          {
            name: 'generic_api_key',
            label: 'API Key',
            placeholder: 'whop_xxxxxxxxxxxx',
            required: true,
          },
        ],
        is_active: true,
      },
      {
        id: 'fanbasis',
        provider: 'fanbasis',
        name: 'FanBasis',
        description:
          'Connect FanBasis to manage products, checkout sessions, subscriptions, customers, and discount codes.',
        category: 'payments',
        auth_type: 'api_key',
        is_active: true,
      },
      {
        id: 'hubspot',
        provider: 'hubspot',
        name: 'HubSpot',
        description: 'Connect HubSpot to manage contacts, deals, campaigns, and CRM workflows.',
        category: 'crm',
        is_active: true,
      },
      {
        id: 'salesforce',
        provider: 'salesforce',
        name: 'Salesforce',
        description: 'Connect Salesforce to manage leads, accounts, opportunities, and CRM data.',
        category: 'crm',
        is_active: true,
      },
      {
        id: 'google_drive',
        provider: 'google_drive',
        name: 'Google Drive',
        description: 'Connect Google Drive to browse, upload, and sync files with your campaigns.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'dropbox',
        provider: 'dropbox',
        name: 'Dropbox',
        description: 'Connect Dropbox to browse, upload, and sync files with your campaigns.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'google_sheets',
        provider: 'google_sheets',
        name: 'Google Sheets',
        description: 'Connect Google Sheets to read, write, and manage spreadsheet data.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'airtable',
        provider: 'airtable',
        name: 'Airtable',
        description:
          'Connect Airtable to manage bases, tables, records, comments, fields, and attachments.',
        category: 'productivity',
        auth_type: 'oauth2',
        is_active: true,
      },
      {
        id: 'google_docs',
        provider: 'google_docs',
        name: 'Google Docs',
        description: 'Connect Google Docs to create, read, and edit documents.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'google_calendar',
        provider: 'google_calendar',
        name: 'Google Calendar',
        description: 'Connect Google Calendar to manage events, schedules, and availability.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'wordpress',
        provider: 'wordpress',
        name: 'WordPress',
        description:
          'Connect WordPress.com, Jetpack, or self-hosted WordPress sites to publish posts, pages, categories, tags, and media.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'calendly',
        provider: 'calendly',
        name: 'Calendly',
        description:
          'Connect Calendly to manage event types, schedule meetings, and embed scheduling widgets in funnels.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'clickup',
        provider: 'clickup',
        name: 'ClickUp',
        description: 'Connect ClickUp to manage tasks, projects, and team workflows.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'notion',
        provider: 'notion',
        name: 'Notion',
        description: 'Connect Notion to manage pages, databases, and workspace content.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'canva',
        provider: 'canva',
        name: 'Canva',
        description:
          'Connect Canva to manage designs, templates, brand assets, and creative workflows.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'zoom',
        provider: 'zoom',
        name: 'Zoom',
        description: 'Connect Zoom to manage meetings, webinars, and recordings.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'fathom',
        provider: 'fathom',
        name: 'Fathom',
        description: 'Connect Fathom AI to sync meeting recordings, transcripts, and action items.',
        category: 'productivity',
        is_active: true,
      },
      {
        id: 'fireflies',
        provider: 'fireflies',
        name: 'Fireflies',
        description:
          'Connect Fireflies AI to sync meeting transcripts, summaries, and action items.',
        category: 'productivity',
        auth_type: 'api_key',
        is_active: true,
      },
      {
        id: 'github',
        provider: 'github',
        name: 'GitHub',
        description:
          'Connect repositories so agents can read code, commit changes, and create PRs.',
        category: 'developer',
        is_active: true,
      },
      ...(isPlatformAdmin
        ? [
            {
              id: 'openai_codex',
              provider: 'openai_codex',
              name: 'OpenAI Codex',
              description:
                'Admin-only connection for using your OpenAI subscription on Codex models without spending Vibey model credits.',
              category: 'admin' as const,
              is_active: true,
            },
            {
              id: 'anthropic_claude',
              provider: 'anthropic_claude',
              name: 'Claude Subscription',
              description:
                'Admin-only connection for using your Claude subscription on Claude models ' +
                'without spending Vibey model credits.',
              category: 'admin' as const,
              auth_type: 'api_key' as const,
              connection_fields: [
                {
                  name: 'setup_token',
                  label: 'Claude setup-token',
                  placeholder: 'sk-ant-oat01-...',
                  required: true,
                  helpTitle: 'Where to get it',
                  helpText:
                    'This is generated by the Claude Code CLI. It is not an Anthropic Console API key.',
                  helpCommand: 'claude setup-token',
                  helpSteps: [
                    'Open a terminal on any machine where Claude Code is signed in to your Claude subscription.',
                    'Run the command and copy the full token it prints.',
                    'Paste it here. Vibey accepts the token that starts with sk-ant-oat01-.',
                  ],
                },
              ],
              is_active: true,
            },
          ]
        : []),
      {
        id: 'cursor',
        provider: 'cursor',
        name: 'Cursor',
        description:
          `Connect Cursor Cloud Agents to write code and open PRs from Space automations. Grant Cursor GitHub access to your repo in the Cursor dashboard. Register webhook URL: ${buildPlatformWebhookUrl('/api/integrations/cursor/webhook')}`,
        category: 'developer',
        auth_type: 'api_key',
        connection_fields: [
          {
            name: 'api_key',
            label: 'Cursor API Key',
            placeholder: 'key_…',
            required: true,
          },
          {
            name: 'webhook_secret',
            label: 'Webhook Secret',
            placeholder: 'From Cursor dashboard (optional)',
            required: false,
          },
        ],
        is_active: true,
      },
      {
        id: 'supabase',
        provider: 'supabase',
        name: 'Supabase',
        description:
          'Connect your Supabase account to provision databases and auth for Spaces projects.',
        category: 'developer',
        is_active: true,
      },
      {
        id: 'vercel',
        provider: 'vercel',
        name: 'Vercel',
        description: 'Connect Vercel to manage deployments, domains, and project settings.',
        category: 'developer',
        auth_type: 'api_key',
        connection_fields: [
          {
            name: 'bearer_token',
            label: 'Vercel Access Token',
            placeholder: 'Enter your Vercel access token',
            required: true,
          },
        ],
        is_active: true,
      },
    ],
    [isPlatformAdmin],
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
          if (overviewStatus === 'connected') {
            setIntegration({
              id: rowId,
              integration_id: integration.integration_id,
              provider: integration.provider,
              status: 'connected',
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
            metadata: integration.metadata,
          })
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
      const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
      const callbackUrl =
        typeof window !== 'undefined'
          ? buildComposioProxyCallbackUrl(integrationId, redirectTo)
          : ''
      const connectionData = typeof apiKeyOrData === 'object' ? apiKeyOrData : undefined
      const apiKey = typeof apiKeyOrData === 'string' ? apiKeyOrData : undefined
      const connectionScope = options?.connectionScope

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

      const mode = String(providerModes[integrationId] ?? providerModes[provider] ?? '')
        .trim()
        .toLowerCase()
      const LEGACY_OAUTH_PROVIDERS = new Set([
        'gohighlevel',
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
          redirect_url?: string
          error?: string
        }>('/api/integrations/composio/connect', {
          integration_id: integrationId,
          ...(connectionScope ? { connection_scope: connectionScope } : {}),
          callback_url: callbackUrl || redirectTo,
          long_redirect_url: true,
          ...(connectionData ? { connection_data: connectionData } : {}),
        })
        if (!res?.success) throw new Error(res?.error || 'Failed to initiate connection')
        if (connectionData || !res?.redirect_url) {
          await loadData()
          return { completedSynchronously: true }
        }
        window.open(res.redirect_url, '_blank', 'noopener,noreferrer')
        return
      }

      if (provider === 'gohighlevel') {
        const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
          '/api/integrations/lhg/connect',
          { redirectTo },
        )
        if (!res?.authorizeUrl) throw new Error('Missing authorizeUrl')
        window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
      } else if (provider === 'stripe') {
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
        if (!apiKey) throw new Error('API key required')
        await backendPost('/api/integrations/fireflies/connect', { apiKey })
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
