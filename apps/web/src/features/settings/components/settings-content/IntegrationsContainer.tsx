'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { backendGet } from '@/lib/api/backend-client'
import {
  subscribeIntegrationOAuthEvents,
  type IntegrationOAuthEvent,
} from '@/lib/integrations/composio-oauth'
import {
  getIntegrationConnectedMessage,
  INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER,
  INTEGRATION_CONNECT_SUCCESS_FALLBACK,
  SETTINGS_TOAST_ERRORS,
  SETTINGS_TOAST_SUCCESS,
} from '../../config/settings-toast-errors.config'
import type { Integration, IntegrationsTab, UserIntegration } from './integrations.types'
import { IntegrationsView } from './IntegrationsView'
import { useIntegrations, type ConnectIntegrationOptions } from './useIntegrations'

export function IntegrationsContainer() {
  const searchParams = useSearchParams()
  const { integrationsFocusIntegrationId, consumeIntegrationsFocusIntegrationId } =
    useWorkspaceSettingsModal()
  const focusScrollTimeoutRef = useRef<number | null>(null)
  const oauthPollBaselineRef = useRef<{
    provider: string
    integrationId: string
    connectedCount: number
    forceNew: boolean
  } | null>(null)
  const [activeTab, setActiveTab] = useState<IntegrationsTab>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [pendingSocialReportingPicker, setPendingSocialReportingPicker] = useState<
    'linkedin' | 'facebook' | 'youtube' | null
  >(null)
  const [autoOpenSocialReportingPickerId, setAutoOpenSocialReportingPickerId] = useState<
    string | null
  >(null)
  const [autoOpenSocialReportingPickerPlatform, setAutoOpenSocialReportingPickerPlatform] =
    useState<'linkedin' | 'facebook' | 'youtube' | null>(null)

  const {
    availableIntegrations,
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
  } = useIntegrations()

  const finishOAuthConnect = useCallback(
    (integrationId: string | null, showToast = true) => {
      setConnectingProvider(null)
      oauthPollBaselineRef.current = null
      void loadData()
      if (!showToast || !integrationId) return
      const key = integrationId.toLowerCase().replace(/-/g, '_')
      const msg =
        key && INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER[key]
          ? INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER[key]
          : getIntegrationConnectedMessage(integrationId)
      toast.success(msg)
    },
    [loadData],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return subscribeIntegrationOAuthEvents((event: IntegrationOAuthEvent) => {
      if (event.type === 'connected') {
        finishOAuthConnect(event.integrationId || null)
        return
      }
      setConnectingProvider(null)
      toast.error(event.message || SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECTION_FAILED.userMessage)
    })
  }, [finishOAuthConnect])

  useEffect(() => {
    if (!connectingProvider) return

    let cancelled = false
    const integrationId = connectingProvider
    const baseline = oauthPollBaselineRef.current

    // Add-another / reconnect-while-connected: status stays "connected" immediately.
    // Polling would fake success toasts. Wait for OAuth callback / event instead.
    if (baseline?.forceNew || (baseline && baseline.connectedCount > 0)) {
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) setConnectingProvider(null)
      }, 5 * 60 * 1000)
      return () => {
        cancelled = true
        window.clearTimeout(timeoutId)
      }
    }

    const pollStatus = async () => {
      try {
        const res = await backendGet<{ connected?: boolean }>(
          `/api/integrations/status/${encodeURIComponent(integrationId)}`,
        )
        if (cancelled || !res?.connected) return
        finishOAuthConnect(integrationId)
      } catch {
        // Keep polling until timeout.
      }
    }

    void pollStatus()
    const intervalId = window.setInterval(() => void pollStatus(), 2000)
    const timeoutId = window.setTimeout(
      () => {
        if (!cancelled) setConnectingProvider(null)
      },
      5 * 60 * 1000,
    )

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [connectingProvider, finishOAuthConnect])

  useEffect(() => {
    if (!isLoading && !initialLoadComplete) setInitialLoadComplete(true)
  }, [isLoading, initialLoadComplete])

  useEffect(() => {
    if (!pendingSocialReportingPicker || isLoading) return
    const platform = pendingSocialReportingPicker
    const row = userIntegrations.find(
      (r) =>
        String(r.integration_id ?? '').toLowerCase() === platform &&
        String(r.status ?? '').toLowerCase() === 'connected',
    )
    if (!row) return

    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}

    const hasReportingTarget =
      platform === 'linkedin'
        ? typeof metadata.linkedin_organization_urn === 'string' &&
          metadata.linkedin_organization_urn.trim().startsWith('urn:li:organization:')
        : platform === 'facebook'
          ? typeof metadata.facebook_page_id === 'string' && metadata.facebook_page_id.trim()
          : typeof metadata.youtube_channel_id === 'string' && metadata.youtube_channel_id.trim()

    if (!hasReportingTarget) {
      setAutoOpenSocialReportingPickerId(row.id)
      setAutoOpenSocialReportingPickerPlatform(platform)
    }
    setPendingSocialReportingPicker(null)
  }, [pendingSocialReportingPicker, isLoading, userIntegrations])

  useEffect(() => {
    const tab = searchParams.get('tab') as IntegrationsTab | null
    if (tab && (tab === 'manage' || tab === 'library')) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    const id = integrationsFocusIntegrationId
    if (!id || !initialLoadComplete || availableIntegrations.length === 0) return

    const found = availableIntegrations.find((i) => i.id === id)
    setActiveTab('library')
    setSearchQuery(found?.name ?? id)
    consumeIntegrationsFocusIntegrationId()

    focusScrollTimeoutRef.current = window.setTimeout(() => {
      document
        .querySelector(`[data-integration-id="${id}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      focusScrollTimeoutRef.current = null
    }, 150)

    return () => {
      if (focusScrollTimeoutRef.current != null) {
        window.clearTimeout(focusScrollTimeoutRef.current)
        focusScrollTimeoutRef.current = null
      }
    }
  }, [
    integrationsFocusIntegrationId,
    initialLoadComplete,
    availableIntegrations,
    consumeIntegrationsFocusIntegrationId,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    let mutated = false

    if (searchParams.get('ghl_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.gohighlevel ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('ghl_connected')
      mutated = true
    }
    if (searchParams.get('github_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.github ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('github_connected')
      mutated = true
    }
    if (searchParams.get('stripe_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.stripe ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('stripe_connected')
      mutated = true
    }
    if (searchParams.get('paypal_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.paypal ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('paypal_connected')
      mutated = true
    }
    if (searchParams.get('meta_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.meta ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()

      setTimeout(() => {
        toast.info(
          'Your Meta ad account is connected. Head to your Ads dashboard and hit "Sync Meta Ads" to pull in your existing campaigns for analysis.',
          { duration: 8000 },
        )
      }, 1500)

      url.searchParams.delete('meta_connected')
      mutated = true
    }
    if (searchParams.get('calendly_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.calendly ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('calendly_connected')
      mutated = true
    }
    if (searchParams.get('google_drive_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.google_drive ??
          INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('google_drive_connected')
      mutated = true
    }
    if (searchParams.get('dropbox_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.dropbox ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('dropbox_connected')
      mutated = true
    }
    if (searchParams.get('fathom_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.fathom ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('fathom_connected')
      mutated = true
    }
    if (searchParams.get('slack_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.slack ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('slack_connected')
      mutated = true
    }
    if (searchParams.get('supabase_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.supabase ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('supabase_connected')
      mutated = true
    }
    if (searchParams.get('wordpress_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.wordpress ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      loadData()
      url.searchParams.delete('wordpress_connected')
      mutated = true
    }
    if (searchParams.get('composio_connected') === '1') {
      const integrationId = searchParams.get('integration')?.toLowerCase()
      if (
        integrationId === 'linkedin' ||
        integrationId === 'facebook' ||
        integrationId === 'youtube'
      ) {
        setPendingSocialReportingPicker(integrationId)
        setActiveTab('manage')
      }
      finishOAuthConnect(integrationId ?? null, false)
      url.searchParams.delete('composio_connected')
      url.searchParams.delete('integration')
      mutated = true
    }
    const paypalError = searchParams.get('paypal_error')
    if (paypalError) {
      const paypalErrorMessages: Record<string, string> = {
        access_denied: 'PayPal connection was cancelled.',
        userinfo_failed:
          'PayPal connected but we could not read your profile. Check Developer Dashboard → Log in with PayPal → user information checkboxes.',
        token_exchange_failed: 'PayPal rejected the authorization code. Try connecting again.',
        invalid_state: 'PayPal session expired. Start the connection again.',
        missing_code_or_state: 'PayPal did not return a valid response. Try again.',
      }
      toast.error(
        paypalErrorMessages[paypalError] ??
          SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      url.searchParams.delete('paypal_error')
      mutated = true
    }
    if (searchParams.get('composio_error')) {
      const message =
        searchParams.get('composio_error_message') || searchParams.get('composio_error')
      setConnectingProvider(null)
      toast.error(message || SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECTION_FAILED.userMessage)
      url.searchParams.delete('composio_error')
      url.searchParams.delete('composio_error_message')
      url.searchParams.delete('integration')
      mutated = true
    }
    const wordpressError = searchParams.get('wordpress_error')
    if (wordpressError) {
      const wordpressErrorMessages: Record<string, string> = {
        rejected: 'WordPress connection was cancelled.',
        access_denied: 'WordPress connection was cancelled.',
        invalid_state: 'WordPress session expired. Start the connection again.',
      }
      setConnectingProvider(null)
      toast.error(
        wordpressErrorMessages[wordpressError] ??
          SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      url.searchParams.delete('wordpress_error')
      mutated = true
    }

    if (mutated) {
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, finishOAuthConnect, loadData])

  const handleTabChange = (tab: IntegrationsTab) => setActiveTab(tab)

  const handleConnect = async (
    integration: Integration,
    apiKeyOrData?: string | Record<string, string>,
    options?: ConnectIntegrationOptions,
  ) => {
    const provider = integration.provider.toLowerCase()
    const connectedCount = userIntegrations.filter(
      (row) =>
        row.integration_id === integration.id && String(row.status).toLowerCase() === 'connected',
    ).length
    oauthPollBaselineRef.current = {
      provider,
      integrationId: integration.id,
      connectedCount,
      forceNew: options?.forceNew === true,
    }
    setConnectingProvider(provider)
    try {
      const result = await connectIntegration(integration, apiKeyOrData, options)
      if (integration.auth_type === 'api_key' || result?.completedSynchronously) {
        toast.success(getIntegrationConnectedMessage(integration.name))
        setConnectingProvider(null)
        oauthPollBaselineRef.current = null
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      setConnectingProvider(null)
      oauthPollBaselineRef.current = null
    }
  }

  const handleRefresh = async (userIntegration: UserIntegration) => {
    try {
      await refreshIntegration(userIntegration)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_REFRESH_FAILED.userMessage,
      )
    }
  }

  const handleDisconnect = async (userIntegration: UserIntegration) => {
    try {
      await disconnectIntegration(userIntegration)
      toast.success(SETTINGS_TOAST_SUCCESS.INTEGRATION_DISCONNECTED.userMessage)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_DISCONNECT_FAILED.userMessage,
      )
      throw e
    }
  }

  const handleReconnect = async (integration: Integration) => {
    await handleConnect(integration)
  }

  const handleRemove = async (userIntegration: UserIntegration) => {
    try {
      await removeIntegration(userIntegration)
      toast.success(SETTINGS_TOAST_SUCCESS.INTEGRATION_REMOVED.userMessage)
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_REMOVE_FAILED.userMessage,
      )
    }
  }

  const handleSetDefault = async (userIntegration: UserIntegration) => {
    try {
      await setDefaultOrgSharedIntegration(userIntegration)
      toast.success('Default connection updated')
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
    }
  }

  const handleChangeScope = async (
    userIntegration: UserIntegration,
    newScope: 'personal' | 'org_shared',
  ) => {
    try {
      await changeIntegrationScope(userIntegration, newScope)
      toast.success(newScope === 'org_shared' ? 'Shared with org' : 'Set to personal')
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
    }
  }

  const handleRename = async (userIntegration: UserIntegration, connectionLabel: string) => {
    try {
      await renameIntegrationConnection(userIntegration, connectionLabel)
      toast.success('Connection renamed')
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      throw e
    }
  }

  if (!initialLoadComplete) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <IntegrationsView
        activeTab={activeTab}
        availableIntegrations={availableIntegrations}
        metaLibraryEligible={metaLibraryEligible}
        userIntegrations={userIntegrations}
        providerModes={providerModes}
        isLoading={isLoading}
        error={error}
        connectingProvider={connectingProvider}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onTabChange={handleTabChange}
        onConnect={handleConnect}
        onRefresh={handleRefresh}
        onDisconnect={handleDisconnect}
        onReconnect={handleReconnect}
        onRemove={handleRemove}
        onSetDefault={handleSetDefault}
        onChangeScope={handleChangeScope}
        onRename={handleRename}
        canManageOrgShared={canManageOrgShared}
        autoOpenSocialReportingPickerId={autoOpenSocialReportingPickerId}
        autoOpenSocialReportingPickerPlatform={autoOpenSocialReportingPickerPlatform}
      />
    </div>
  )
}
